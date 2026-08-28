import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const SOURCE_URL =
  'https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/';
const POST_ID = 343982;
const output = process.argv[2];

if (!output) {
  throw new Error('Thiếu đường dẫn đầu ra. Ví dụ: npm run source:fetch -- /tmp/minevn-guide.html');
}

const response = await fetch(SOURCE_URL, {
  redirect: 'follow',
  headers: {
    accept: 'text/html,application/xhtml+xml',
    'user-agent': 'MinecraftGuideArchiver/1.0 (+source attribution)',
  },
});
if (!response.ok) throw new Error(`Không tải được bài nguồn: HTTP ${response.status}`);

const html = await response.text();
const $ = cheerio.load(html);
const post = $(`#js-post-${POST_ID}`);
const body = post.find('.message-body .bbWrapper').first();
if (!body.length) throw new Error(`Không tìm thấy nội dung bài #${POST_ID}.`);

const target = path.resolve(output);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, html);

console.log({
  source: SOURCE_URL,
  postId: POST_ID,
  output: target,
  textLength: body.text().replace(/\s+/g, ' ').trim().length,
  headings: body.find('h2,h3,h4').length,
  images: body.find('img').length,
  tables: body.find('table').length,
  codeBlocks: body.find('.bbCodeBlock--code').length,
});
