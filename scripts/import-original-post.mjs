import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const SOURCE_URL =
  'https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/';
const input = process.argv[2];
const outputPath = path.resolve('src/data/original-post.html');
const metaPath = path.resolve('src/data/original-post-meta.json');
const fragmentManifestPath = path.resolve('src/data/chapter-fragments.json');
const fragmentDirectory = path.resolve('src/data/chapters');
const attachmentManifestPath = path.resolve('src/data/attachments.json');
const attachmentDirectory = path.resolve('public/attachments');
const mediaManifest = JSON.parse(await readFile('src/data/media.json', 'utf8'));

const fragmentDefinitions = [
  { id: 'glossary', start: null, end: 'intro' },
  { id: 'intro', start: 'intro', end: 'preparation' },
  { id: 'preparation', start: 'preparation', end: 'setup' },
  { id: 'setup-intro', start: 'setup', end: '-3-2-server-properties-thiet-dat-can-thiet' },
  { id: 'server-properties', start: '-3-2-server-properties-thiet-dat-can-thiet', end: '-3-3-bukkit-yml-thiet-dat-can-thiet' },
  { id: 'bukkit-yml', start: '-3-3-bukkit-yml-thiet-dat-can-thiet', end: '-3-4-spigot-yml-thiet-dat-can-thiet' },
  { id: 'spigot-yml', start: '-3-4-spigot-yml-thiet-dat-can-thiet', end: '-3-5-paper-configs-tep-thiet-dat-can-thiet' },
  { id: 'paper-world', start: '-3-5-paper-configs-tep-thiet-dat-can-thiet', end: '-%CB%96-%E1%B5%8E%E1%B5%8E-3-5-2-paper-global-yml' },
  { id: 'paper-global', start: '-%CB%96-%E1%B5%8E%E1%B5%8E-3-5-2-paper-global-yml', end: '-3-6-purpur-yml-thiet-dat-can-thiet' },
  { id: 'purpur-yml', start: '-3-6-purpur-yml-thiet-dat-can-thiet', end: '-3-7-leaf-global-yml' },
  { id: 'leaf-global', start: '-3-7-leaf-global-yml', end: '-3-8-config-gale-world-defaults-yml-thiet-dat-can-thiet' },
  { id: 'gale', start: '-3-8-config-gale-world-defaults-yml-thiet-dat-can-thiet', end: 'integrations' },
  { id: 'integrations-intro', start: 'integrations', end: '-4-1-plugins-sm' },
  { id: 'plugins', start: '-4-1-plugins-sm', end: '-4-2-datapack-goi-du-lieu' },
  { id: 'datapack', start: '-4-2-datapack-goi-du-lieu', end: '-4-3-phan-tich-nhung-pha-tu-huy-kinh-dien-cua-quan-tri-vien-may-chu' },
  { id: 'admin-mistakes', start: '-4-3-phan-tich-nhung-pha-tu-huy-kinh-dien-cua-quan-tri-vien-may-chu', end: '-4-4-website-huu-ich' },
  { id: 'useful-websites', start: '-4-4-website-huu-ich', end: 'free-options' },
  { id: 'free-options', start: 'free-options', end: 'operations' },
  { id: 'operations', start: 'operations', end: 'next' },
  { id: 'next', start: 'next', end: 'references' },
  { id: 'references', start: 'references', end: null, includeAttachments: true },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeFilename(value, index) {
  const extension = path.extname(value).toLowerCase();
  const stem = path.basename(value, extension)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || `attachment-${index + 1}`;
  return `${String(index + 1).padStart(2, '0')}-${stem}${extension}`;
}

async function getHtml() {
  if (input) return readFile(path.resolve(input), 'utf8');
  const response = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'MinecraftGuideArchiver/1.0 (+source attribution)' },
  });
  if (!response.ok) throw new Error(`Không tải được bài nguồn: ${response.status}`);
  return response.text();
}

async function downloadAttachment(item) {
  const target = path.join(attachmentDirectory, item.filename);
  try {
    await access(target);
    return { ...item, status: 'downloaded' };
  } catch {
    // Chưa có file local.
  }

  const response = await fetch(item.source, {
    redirect: 'follow',
    headers: {
      referer: SOURCE_URL,
      'user-agent': 'Mozilla/5.0 MinecraftGuideArchiver/1.0',
    },
  });
  if (!response.ok) return { ...item, status: 'failed', error: `HTTP ${response.status}` };
  const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (contentType === 'text/html') {
    return { ...item, status: 'failed', error: 'Nguồn trả về HTML thay vì file' };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  return { ...item, status: 'downloaded', bytes: buffer.byteLength, contentType };
}

const html = await getHtml();
const source = cheerio.load(html);
const post = source('#js-post-343982');
const sourceBody = post.find('.message-body .bbWrapper').first();
if (!sourceBody.length) throw new Error('Không tìm thấy nội dung bài #1 (post-343982).');

const $ = cheerio.load(`<div id="original-post-root">${sourceBody.html()}</div>`, {}, false);
const root = $('#original-post-root');

// Chuyển widget spoiler phụ thuộc JavaScript của XenForo sang HTML nguyên bản.
root.find('.bbCodeSpoiler').each((_, element) => {
  const spoiler = $(element);
  const title = spoiler.find('.bbCodeSpoiler-button-title').first().text().trim() || 'Nội dung mở rộng';
  const content = spoiler.find('.bbCodeSpoiler-content').first().html() || '';
  spoiler.replaceWith(
    `<details class="original-spoiler"><summary>${escapeHtml(title)}</summary><div class="original-spoiler__content">${content}</div></details>`,
  );
});

// Các nút “nhấn để mở rộng” là chrome của diễn đàn; nội dung bên trong luôn được giữ và hiển thị.
root.find('script, style, .bbCodeBlock-expandLink, .hoverLink, .xv-copy-button').remove();
root.find('.bbCodeBlock-expandContent').removeClass('bbCodeBlock-expandContent js-expandContent');

// Giữ anchor gốc của từng heading để các liên kết nội bộ vẫn hoạt động.
root.find('.u-anchorTarget').each((_, element) => {
  const anchor = $(element);
  const name = anchor.attr('name') || anchor.attr('id');
  const heading = anchor.closest('h2, h3, h4');
  if (name && heading.length && !heading.attr('id')) heading.attr('id', name);
  anchor.remove();
});

const chapterIds = [
  [/^0\. TABLE OF CONTENTS/i, 'glossary', 'Phần 00'],
  [/^1\. INTRO/i, 'intro', 'Phần 01'],
  [/^2\. Preparations/i, 'preparation', 'Phần 02'],
  [/^2\.2\. Hosting/i, 'hosting', 'Mục 2.2'],
  [/^3\. Setup/i, 'setup', 'Phần 03'],
  [/^4\. Advanced system integrations/i, 'integrations', 'Phần 04'],
  [/^5\./i, 'free-options', 'Phần 05'],
  [/^6\./i, 'operations', 'Phần 06'],
  [/^7\./i, 'next', 'Phần 07'],
  [/^8\./i, 'references', 'Phần 08'],
];
root.find('h2, h3').each((_, element) => {
  const heading = $(element);
  const text = heading.text().replace(/\s+/g, ' ').trim();
  const match = chapterIds.find(([pattern]) => pattern.test(text));
  if (match) {
    heading.attr('id', match[1]);
    heading.attr('data-kicker', match[2]);
  }
});

// Ba heading trong nguyên tác chỉ chứa ảnh phân cách. Chuyển chúng thành figure để
// cây heading không còn các mục rỗng, nhưng vẫn giữ nguyên ảnh và vị trí hiển thị.
root.find('h2, h3, h4').each((_, element) => {
  const heading = $(element);
  if (heading.text().replace(/\s+/g, ' ').trim() || !heading.find('img').length) return;
  const figure = $('<figure class="original-break-figure" aria-hidden="true"></figure>');
  const id = heading.attr('id');
  if (id) figure.attr('id', id);
  figure.html(heading.html() || '');
  heading.replaceWith(figure);
});

// Các tên phần mềm được XenForo đặt H2 dù nằm dưới mục 2.x. Hạ đúng một cấp
// ngữ nghĩa để trình đọc màn hình và công cụ tìm kiếm hiểu đúng cấu trúc tài liệu.
const topLevelChapterIds = new Set([
  'glossary', 'intro', 'preparation', 'setup', 'integrations',
  'free-options', 'operations', 'next', 'references',
]);
root.find('h2.bbHeading').each((_, element) => {
  const heading = $(element);
  if (topLevelChapterIds.has(heading.attr('id'))) return;
  const replacement = $('<h4></h4>');
  for (const [name, value] of Object.entries(element.attribs || {})) replacement.attr(name, value);
  replacement.html(heading.html() || '');
  heading.replaceWith(replacement);
});

// Đánh dấu chín chương lớn để tạo nhịp đọc rõ ràng mà không thay đổi thứ tự nội dung.
for (const id of topLevelChapterIds) {
  root.find(`#${id}`).addClass('original-chapter-heading');
}

// Gắn media theo URL nguồn. XenForo có một số bảng HTML không hợp lệ khiến parser
// có thể đổi thứ tự node; ghép theo chỉ số sẽ làm hình minh họa bị lệch vị trí.
const mediaBySource = new Map(
  mediaManifest.items
    .filter((item) => item.source && item.filename)
    .map((item) => [item.source, item]),
);
let mappedImages = 0;
root.find('img').each((index, element) => {
  const image = $(element);
  const rawSource = image.attr('data-src') || image.attr('data-url') || image.attr('src');
  const sourceUrl = rawSource && !rawSource.startsWith('data:')
    ? new URL(rawSource, SOURCE_URL).href
    : '';
  const media = mediaBySource.get(sourceUrl);
  if (!media?.filename) {
    throw new Error(`Thiếu media local tại vị trí ${index + 1}: ${sourceUrl || '(không có URL)'}`);
  }
  image.attr('src', `__BASE__media/source/${media.filename}`);
  image.attr('loading', 'lazy');
  image.attr('decoding', 'async');
  image.removeAttr('srcset data-url data-src data-zoom-target');
  mappedImages += 1;
});

if (mappedImages !== mediaManifest.occurrenceCount) {
  throw new Error(`Số media đã gắn (${mappedImages}) khác manifest (${mediaManifest.occurrenceCount}).`);
}

root.find('a').each((_, element) => {
  const link = $(element);
  const href = link.attr('href');
  if (!href || href.startsWith('#')) return;
  if (href.startsWith('javascript:')) {
    link.removeAttr('href');
    return;
  }
  link.attr('href', new URL(href, SOURCE_URL).href);
  link.attr('target', '_blank');
  link.attr('rel', 'noreferrer');
});

root.find('iframe').each((_, element) => {
  const frame = $(element);
  const src = frame.attr('src');
  if (src) frame.attr('src', new URL(src, SOURCE_URL).href);
  frame.attr('loading', 'lazy');
  if (!frame.attr('title')) frame.attr('title', 'Nội dung nhúng từ bài gốc');
});

// Loại thuộc tính hành vi XenForo, giữ nguyên class/style phục vụ trình bày.
root.find('*').each((_, element) => {
  for (const attribute of Object.keys(element.attribs || {})) {
    if (attribute.startsWith('data-') || attribute.startsWith('on')) $(element).removeAttr(attribute);
  }
  const className = $(element).attr('class');
  if (className) {
    const cleaned = className.split(/\s+/).filter((name) => name && !name.startsWith('js-')).join(' ');
    cleaned ? $(element).attr('class', cleaned) : $(element).removeAttr('class');
  }
});

// Tải và dựng lại toàn bộ danh sách attachment của post #1.
const attachments = [];
post.find('.message-attachments .attachmentList > li').each((index, element) => {
  const attachment = source(element);
  const name = attachment.find('.file-name').first().text().trim();
  const meta = attachment.find('.file-meta').first().text().replace(/\s+/g, ' ').trim();
  const href = attachment.find('a.file-preview[href]').attr('href');
  if (!name || !href) return;
  attachments.push({
    order: index + 1,
    name,
    meta,
    source: new URL(href, SOURCE_URL).href,
    filename: safeFilename(name, index),
    isImage: /\.(avif|gif|jpe?g|png|webp)$/i.test(name),
  });
});

await mkdir(attachmentDirectory, { recursive: true });
const downloadedAttachments = [];
for (const attachment of attachments) {
  downloadedAttachments.push(await downloadAttachment(attachment));
  process.stdout.write(`\rĐã xử lý attachment ${attachment.order}/${attachments.length}`);
}
process.stdout.write('\n');

const attachmentCards = downloadedAttachments.map((item) => {
  const href = item.status === 'downloaded'
    ? `__BASE__attachments/${item.filename}`
    : item.source;
  const preview = item.isImage && item.status === 'downloaded'
    ? `<img src="__BASE__attachments/${item.filename}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />`
    : `<span class="original-attachment__icon" aria-hidden="true">${item.name.endsWith('.zip') ? 'ZIP' : 'TXT'}</span>`;
  return `<li class="original-attachment">
    <a href="${href}" target="_blank" rel="noreferrer">${preview}<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.meta)}</small></span><i aria-hidden="true">↗</i></a>
  </li>`;
}).join('\n');

const attachmentSection = `<section class="original-attachments" aria-labelledby="original-attachments-title">
  <h2 id="original-attachments-title">Đính kèm</h2>
  <ul>${attachmentCards}</ul>
</section>`;

const rootChildren = root.contents().toArray();
function childIndexForId(id) {
  if (!id) return null;
  const target = root.find(`[id="${id}"]`).first()[0];
  if (!target) throw new Error(`Không tìm thấy mốc fragment: ${id}`);
  let topLevel = target;
  while (topLevel.parent && topLevel.parent !== root[0]) topLevel = topLevel.parent;
  const index = rootChildren.indexOf(topLevel);
  if (index < 0) throw new Error(`Mốc fragment không nằm trong bài: ${id}`);
  return index;
}

const fragmentItems = fragmentDefinitions.map((definition) => {
  const startIndex = definition.start ? childIndexForId(definition.start) : 0;
  const endIndex = definition.end ? childIndexForId(definition.end) : rootChildren.length;
  if (endIndex <= startIndex) throw new Error(`Khoảng fragment không hợp lệ: ${definition.id}`);
  const body = rootChildren.slice(startIndex, endIndex).map((node) => $.html(node)).join('');
  const html = `${body}${definition.includeAttachments ? `\n${attachmentSection}\n` : ''}`;
  const parsed = cheerio.load(html, {}, false);
  return {
    ...definition,
    filename: `${definition.id}.html`,
    html,
    textLength: parsed.text().replace(/\s+/g, ' ').trim().length,
    headings: parsed('h2,h3,h4').length,
    images: parsed('img').not('.original-attachments img').length,
    tables: parsed('table').length,
    codeBlocks: parsed('.bbCodeBlock--code').length,
    firstHeadingId: parsed('h2,h3,h4').first().attr('id') || null,
    anchors: parsed('[id]').map((_, element) => parsed(element).attr('id')).get().filter(Boolean),
    outline: parsed('h2,h3,h4').map((_, element) => ({
      id: parsed(element).attr('id') || null,
      level: Number(element.tagName.slice(1)),
      title: parsed(element).text().replace(/\s+/g, ' ').trim(),
    })).get().filter((item) => item.id && item.title),
  };
});

const output = fragmentItems.map((item) => item.html).join('');
await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(fragmentDirectory, { recursive: true });
await writeFile(outputPath, output);
for (const item of fragmentItems) {
  await writeFile(path.join(fragmentDirectory, item.filename), item.html);
}
await writeFile(fragmentManifestPath, `${JSON.stringify({
  source: SOURCE_URL,
  postId: 343982,
  generatedAt: new Date().toISOString(),
  count: fragmentItems.length,
  items: fragmentItems.map(({ html: _html, ...item }) => item),
}, null, 2)}\n`);
await writeFile(attachmentManifestPath, `${JSON.stringify({
  source: SOURCE_URL,
  postId: 343982,
  generatedAt: new Date().toISOString(),
  count: downloadedAttachments.length,
  downloadedCount: downloadedAttachments.filter((item) => item.status === 'downloaded').length,
  items: downloadedAttachments,
}, null, 2)}\n`);

const generated = cheerio.load(output, {}, false);
const meta = {
  source: SOURCE_URL,
  postId: 343982,
  generatedAt: new Date().toISOString(),
  sourceTextLength: sourceBody.text().replace(/\s+/g, ' ').trim().length,
  generatedTextLength: generated.text().replace(/\s+/g, ' ').trim().length,
  headings: generated('h2,h3,h4').length,
  bodyHeadings: root.find('h2,h3,h4').length,
  images: root.find('img').length,
  tables: root.find('table').length,
  codeBlocks: root.find('.bbCodeBlock--code').length,
  spoilers: root.find('.original-spoiler').length,
  attachments: downloadedAttachments.length,
};
await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

console.log(meta);
if (downloadedAttachments.some((item) => item.status === 'failed')) process.exitCode = 1;
