import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const SOURCE_URL =
  'https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/';
const input = process.argv[2];
const outputDirectory = path.resolve('public/media/source');
const manifestPath = path.resolve('src/data/media.json');

const contentTypeExtensions = new Map([
  ['image/avif', '.avif'],
  ['image/gif', '.gif'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/svg+xml', '.svg'],
  ['image/webp', '.webp'],
]);

const sourceFallbacks = new Map([
  [
    'https://minecraft.wiki/images/thumb/Entities%27_hitboxes_comparison.png/300px-Entities%27_hitboxes_comparison.png?15c98',
    'https://minevn.net/proxy.php?image=https%3A%2F%2Fminecraft.wiki%2Fimages%2Fthumb%2FEntities%2527_hitboxes_comparison.png%2F300px-Entities%2527_hitboxes_comparison.png%3F15c98&hash=53281c9388dbde41407d031bb4908a31',
  ],
  [
    'https://images2.imgbox.com/3e/ed/W3ZVyqGl_o.gif',
    'https://minevn.net/proxy.php?image=https%3A%2F%2Fimages2.imgbox.com%2F3e%2Fed%2FW3ZVyqGl_o.gif&hash=daa0ba015947c7bc934d95c27e2496c9',
  ],
  [
    'https://images2.imgbox.com/f5/51/gTqK4cGi_o.gif',
    'https://minevn.net/proxy.php?image=https%3A%2F%2Fimages2.imgbox.com%2Ff5%2F51%2FgTqK4cGi_o.gif&hash=50ed610aa0448fcd652fe0e0eb18aec7',
  ],
]);

function safeStem(value, fallback) {
  const stem = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.[a-zA-Z0-9]{2,5}$/i, '')
    .slice(0, 72);
  return stem || fallback;
}

async function getHtml() {
  if (input) return readFile(path.resolve(input), 'utf8');
  const response = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'MinecraftGuideArchiver/1.0 (+source attribution)' },
  });
  if (!response.ok) throw new Error(`Không tải được bài nguồn: ${response.status}`);
  return response.text();
}

async function download(item, index) {
  let lastError;
  const candidates = [item.source, sourceFallbacks.get(item.source)].filter(Boolean);
  for (const candidate of candidates) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(candidate, {
        redirect: 'follow',
        headers: {
          accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,*/*;q=0.7',
          referer: candidate.startsWith('https://minecraft.wiki/')
            ? 'https://minecraft.wiki/'
            : SOURCE_URL,
          'user-agent': 'Mozilla/5.0 MinecraftGuideArchiver/1.0',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
      const urlExtension = path.extname(new URL(response.url).pathname).toLowerCase();
      const extension = contentTypeExtensions.get(contentType) ??
        (/^\.(avif|gif|jpe?g|png|svg|webp)$/.test(urlExtension) ? urlExtension : '.bin');
      if (extension === '.bin') throw new Error(`Không nhận diện được định dạng: ${contentType || 'unknown'}`);

      const hash = createHash('sha1').update(item.source).digest('hex').slice(0, 8);
      const sequence = String(index + 1).padStart(3, '0');
      const filename = `${sequence}-${safeStem(item.alt || new URL(item.source).pathname, 'media')}-${hash}${extension}`;
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(path.join(outputDirectory, filename), buffer);
      return {
        filename,
        bytes: buffer.byteLength,
        contentType,
        status: 'downloaded',
        resolvedSource: candidate,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, attempt * 350));
    }
    }
  }
  return { status: 'failed', error: String(lastError?.message ?? lastError) };
}

const html = await getHtml();
const $ = cheerio.load(html);
const post = $('#js-post-343982 .message-body .bbWrapper').first();
if (!post.length) throw new Error('Không tìm thấy nội dung bài #1 (post-343982).');

const occurrences = [];
post.find('img').each((order, element) => {
  const node = $(element);
  const rawSource = node.attr('data-src') || node.attr('data-url') || node.attr('src');
  if (!rawSource || rawSource.startsWith('data:')) return;
  const source = new URL(rawSource, SOURCE_URL).href;
  occurrences.push({
    order: order + 1,
    source,
    alt: node.attr('alt')?.trim() || node.attr('title')?.trim() || `Ảnh minh họa ${order + 1}`,
    title: node.attr('title')?.trim() || '',
    width: Number(node.attr('width')) || null,
    height: Number(node.attr('height')) || null,
    decorative: node.hasClass('smilie'),
  });
});

const uniqueSources = [...new Map(occurrences.map((item) => [item.source, item])).values()];
await mkdir(outputDirectory, { recursive: true });

let existingBySource = new Map();
try {
  const existingManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  existingBySource = new Map(
    existingManifest.items
      .filter((item) => item.status === 'downloaded' && item.filename)
      .map((item) => [item.source, item]),
  );
} catch {
  // Lần import đầu tiên chưa có manifest để tái sử dụng.
}

let cursor = 0;
const downloads = new Array(uniqueSources.length);
async function worker() {
  while (cursor < uniqueSources.length) {
    const index = cursor++;
    const item = uniqueSources[index];
    const existing = existingBySource.get(item.source);
    if (existing) {
      try {
        await access(path.join(outputDirectory, existing.filename));
        downloads[index] = {
          filename: existing.filename,
          bytes: existing.bytes,
          contentType: existing.contentType,
          status: 'downloaded',
          resolvedSource: existing.resolvedSource ?? existing.source,
        };
      } catch {
        downloads[index] = await download(item, index);
      }
    } else {
      downloads[index] = await download(item, index);
    }
    process.stdout.write(`\rĐã xử lý ${index + 1}/${uniqueSources.length} ảnh`);
  }
}
await Promise.all(Array.from({ length: Math.min(18, uniqueSources.length) }, worker));
process.stdout.write('\n');

const bySource = new Map(
  uniqueSources.map((item, index) => [item.source, { ...item, ...downloads[index] }]),
);
const items = occurrences.map((item) => ({ ...item, ...bySource.get(item.source) }));
const manifest = {
  source: SOURCE_URL,
  postId: 343982,
  generatedAt: new Date().toISOString(),
  occurrenceCount: occurrences.length,
  uniqueCount: uniqueSources.length,
  downloadedCount: downloads.filter((item) => item.status === 'downloaded').length,
  failedCount: downloads.filter((item) => item.status === 'failed').length,
  items,
};

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Hoàn tất: ${manifest.downloadedCount}/${manifest.uniqueCount} ảnh duy nhất, ${manifest.occurrenceCount} vị trí hiển thị.`,
);
if (manifest.failedCount) process.exitCode = 1;
