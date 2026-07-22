import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const guide = JSON.parse(await readFile('src/data/guide-pages.json', 'utf8'));
const notes = JSON.parse(await readFile('src/data/editorial-notes.json', 'utf8'));
const fragments = JSON.parse(await readFile('src/data/chapter-fragments.json', 'utf8'));
const meta = JSON.parse(await readFile('src/data/original-post-meta.json', 'utf8'));
const failures = [];
const htmlFiles = [];

async function loadRoute(slug = '') {
  const filename = path.join('dist', slug, 'index.html');
  try {
    return cheerio.load(await readFile(filename, 'utf8'));
  } catch {
    failures.push(`Thiếu route: /${slug}`);
    return cheerio.load('');
  }
}

for (const page of guide.pages) {
  const $ = await loadRoute(page.slug);
  if ($('h1').length !== 1) failures.push(`/${page.slug}/ có ${$('h1').length} H1`);
  if (!$('.guide-page').length) failures.push(`/${page.slug}/ thiếu guide-page`);
  if (!$('[data-reading-controls]').length) failures.push(`/${page.slug}/ thiếu reading controls`);
  if (page.fragment && !$('.guide-fragment').length) failures.push(`/${page.slug}/ thiếu nội dung fragment`);
  if (/[\u200B-\u200D\uFEFF]/.test($('.guide-fragment').text())) failures.push(`/${page.slug}/ còn ký tự zero-width`);
  const tocText = $('.guide-local-toc').text();
  if (/Essential Tools|Suc' va\^\.t/.test(tocText)) failures.push(`/${page.slug}/ còn tiêu đề chưa chuẩn hóa trong mục lục`);
  if (/[\u200B-\u200D\uFEFF]/.test(tocText)) failures.push(`/${page.slug}/ mục lục còn ký tự zero-width`);
  if (!notes.notes[page.id]?.length) failures.push(`/${page.slug}/ thiếu ghi chú biên tập`);
}

for (const fragment of fragments.items) {
  if (fragment.textLength > 35_000) {
    failures.push(`Fragment ${fragment.id} vượt 35.000 ký tự: ${fragment.textLength}`);
  }
}

const landing = await loadRoute();
if (landing('.chapter-directory > ol > li').length !== 9) failures.push('Landing không có đủ 9 chương');
if (landing('.original-post').length) failures.push('Landing vẫn chứa toàn bộ nguyên tác');
if (!landing.html().includes('"setup":')) failures.push('Landing thiếu bản đồ redirect anchor cũ');

const archive = await loadRoute('nguyen-tac');
if (archive('.original-post img').not('.original-attachments img').length !== meta.images) {
  failures.push('Archive không có đủ media nội dung');
}
if (archive('.original-post table').length !== meta.tables) failures.push('Archive không có đủ bảng');
if (archive('.original-attachment').length !== meta.attachments) failures.push('Archive không có đủ attachment');

try {
  await access('dist/pagefind/pagefind.js');
} catch {
  failures.push('Thiếu Pagefind index');
}

async function walk(directory) {
  const { readdir } = await import('node:fs/promises');
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name === 'index.html') htmlFiles.push(target);
  }
}
await walk('dist');

const siteTitleHref = landing('.site-title').attr('href') || '/';
const basePath = siteTitleHref === '/' ? '' : siteTitleHref.replace(/\/$/, '');
for (const filename of htmlFiles) {
  const $ = cheerio.load(await readFile(filename, 'utf8'));
  const routeDirectory = path.relative('dist', path.dirname(filename)).replaceAll(path.sep, '/');
  const deployedDirectory = `${basePath}/${routeDirectory}`.replace(/\/$/, '');
  for (const element of $('a[href]').toArray()) {
    const href = $(element).attr('href') || '';
    if (!href || /^(https?:|mailto:|javascript:|#)/.test(href)) continue;
    const url = new URL(href, `https://local${deployedDirectory}/`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === basePath) pathname = '/';
    else if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
    if (/^\/(?:_astro|pagefind|media|attachments)\//.test(pathname)) continue;
    let target = path.join('dist', pathname);
    if (target.endsWith('/')) target = path.join(target, 'index.html');
    else if (!path.extname(target)) target = path.join(target, 'index.html');
    try {
      await access(target);
    } catch {
      failures.push(`Link nội bộ hỏng trong ${filename}: ${href}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log({
  routes: guide.pages.length + 2,
  fragments: fragments.count,
  maxFragmentText: Math.max(...fragments.items.map((item) => item.textLength)),
  archiveImages: meta.images,
  internalHtmlFiles: htmlFiles.length,
  pagefind: true,
});
