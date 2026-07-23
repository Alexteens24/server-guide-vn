import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const guide = JSON.parse(await readFile('src/data/guide-pages.json', 'utf8'));
const meta = JSON.parse(await readFile('src/data/original-post-meta.json', 'utf8'));
const failures = [];
const htmlFiles = [];

async function loadHtml(filename, label) {
  try {
    return cheerio.load(await readFile(filename, 'utf8'));
  } catch {
    failures.push(`Thiếu ${label}: ${filename}`);
    return cheerio.load('');
  }
}

const landing = await loadHtml(path.join('dist', 'index.html'), 'trang single-page');
const homeHref = landing('.site-title').attr('href') || '/';
const normalizedHomeHref = homeHref.endsWith('/') ? homeHref : `${homeHref}/`;
if (landing('h1').length !== 1) failures.push(`Trang chính có ${landing('h1').length} H1`);
if (landing('.original-post').length !== 1) failures.push('Trang chính thiếu bài nguyên tác');
if (landing('.original-post .original-chapter-heading').length !== 9) failures.push('Trang chính không có đủ 9 chương nguyên tác');
if (landing('.original-post > .original-chapter').length !== 9) failures.push('Trang chính chưa chia vùng render cho 9 chương');
if (landing('.inline-toc a').length !== 9) failures.push('Mục lục đầu bài không có đủ 9 liên kết');
if (landing('[data-progress-page], [data-progress-dashboard]').length) failures.push('Trang chính vẫn còn checklist/progress');
if (landing('[data-guide-search]').length) failures.push('Trang chính vẫn còn faceted search');

for (const page of guide.pages.filter((item) => !item.parent)) {
  if (!landing(`#${page.id}`).length) failures.push(`Thiếu anchor chương: #${page.id}`);
}

if (landing('.original-post img').not('.original-attachments img').length !== meta.images) {
  failures.push('Single-page không có đủ media nội dung');
}
if (landing('.original-post table').length !== meta.tables) failures.push('Single-page không có đủ bảng');
if (landing('.original-attachment').length !== meta.attachments) failures.push('Single-page không có đủ attachment');
if (landing('.original-post img[data-original-src]').length !== meta.images) {
  failures.push('Single-page chưa tối ưu đủ media nội dung');
}

for (const page of guide.pages) {
  const redirectFile = path.join('dist', page.slug, 'index.html');
  const $ = await loadHtml(redirectFile, `redirect /${page.slug}/`);
  const refresh = $('meta[http-equiv="refresh"]').attr('content') || '';
  if (!refresh.includes(`${normalizedHomeHref}#`)) failures.push(`Redirect /${page.slug}/ không trỏ tới anchor trong base hiện tại`);
}

const notFound = await loadHtml(path.join('dist', '404.html'), '404');
if (!notFound('h1').text().includes('Không tìm thấy trang')) failures.push('404 chưa có nội dung tùy chỉnh');

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

const basePath = homeHref === '/' ? '' : homeHref.replace(/\/$/, '');
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
  documentPages: 1,
  legacyRedirects: guide.pages.length + 2,
  chapters: 9,
  images: meta.images,
  tables: meta.tables,
  attachments: meta.attachments,
  pagefind: true,
});
