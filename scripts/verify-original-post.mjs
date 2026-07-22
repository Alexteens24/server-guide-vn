import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const html = await readFile('src/data/original-post.html', 'utf8');
const meta = JSON.parse(await readFile('src/data/original-post-meta.json', 'utf8'));
const attachments = JSON.parse(await readFile('src/data/attachments.json', 'utf8'));
const fragments = JSON.parse(await readFile('src/data/chapter-fragments.json', 'utf8'));
const $ = cheerio.load(html, {}, false);
const checks = {
  bodyHeadings: $('h2,h3,h4').not('.original-attachments h2').length,
  images: $('img').not('.original-attachments img').length,
  tables: $('table').length,
  codeBlocks: $('.bbCodeBlock--code').length,
  spoilers: $('.original-spoiler').length,
  attachments: $('.original-attachment').length,
};
const expected = {
  bodyHeadings: meta.bodyHeadings,
  images: meta.images,
  tables: meta.tables,
  codeBlocks: meta.codeBlocks,
  spoilers: meta.spoilers,
  attachments: meta.attachments,
};

const failures = Object.entries(expected)
  .filter(([key, value]) => checks[key] !== value)
  .map(([key, value]) => `${key}: ${checks[key]} (cần ${value})`);

const fragmentBodies = [];
for (const fragment of fragments.items) {
  try {
    const body = await readFile(path.join('src/data/chapters', fragment.filename), 'utf8');
    fragmentBodies.push(body);
    const parsed = cheerio.load(body, {}, false);
    const textLength = parsed.text().replace(/\s+/g, ' ').trim().length;
    if (textLength !== fragment.textLength) {
      failures.push(`Sai độ dài fragment ${fragment.id}: ${textLength} (cần ${fragment.textLength})`);
    }
  } catch {
    failures.push(`Thiếu fragment: ${fragment.filename}`);
  }
}

if (fragmentBodies.join('') !== html) {
  failures.push('Ghép các fragment không tái tạo chính xác original-post.html');
}

for (const item of attachments.items) {
  if (item.status !== 'downloaded') {
    failures.push(`Attachment chưa tải: ${item.name}`);
    continue;
  }
  try {
    await access(path.join('public/attachments', item.filename));
  } catch {
    failures.push(`Thiếu attachment: ${item.filename}`);
  }
}

for (const element of $('img').not('.original-attachments img').toArray()) {
  const src = $(element).attr('src') || '';
  const prefix = '__BASE__media/source/';
  if (!src.startsWith(prefix)) {
    failures.push(`Media không trỏ tới local: ${src || '(không có src)'}`);
    continue;
  }
  try {
    await access(path.join('public/media/source', src.slice(prefix.length)));
  } catch {
    failures.push(`Thiếu media: ${src.slice(prefix.length)}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log({ ...checks, fragments: fragments.count, textLength: meta.generatedTextLength });
