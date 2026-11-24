import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../src/data/media.json' with { type: 'json' };

const sourceDirectory = path.resolve('public/media/source');
const outputDirectory = path.resolve('public/media/optimized');
await mkdir(outputDirectory, { recursive: true });

const byFilename = new Map();
for (const item of manifest.items) {
  if (!item.filename || item.status !== 'downloaded') continue;
  const existing = byFilename.get(item.filename);
  byFilename.set(item.filename, {
    decorative: existing ? existing.decorative && item.decorative : item.decorative,
  });
}

const animatedFiles = new Set(
  manifest.items
    .filter((item) => item.status === 'downloaded' && item.filename && item.contentType === 'image/gif')
    .map((item) => item.filename),
);

let generated = 0;
let reused = 0;
for (const [filename, metadata] of byFilename) {
  const source = path.join(sourceDirectory, filename);
  const output = path.join(outputDirectory, `${path.parse(filename).name}.webp`);
  const [sourceStat, outputStat] = await Promise.all([
    stat(source),
    stat(output).catch(() => null),
  ]);
  if (outputStat && !animatedFiles.has(filename) && outputStat.mtimeMs >= sourceStat.mtimeMs) {
    reused++;
    continue;
  }

  const width = metadata.decorative ? 128 : 1280;
  const isAnimated = animatedFiles.has(filename);
  await sharp(source, isAnimated ? { animated: true } : { pages: 1 })
    .rotate()
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .webp({
      quality: metadata.decorative ? 72 : 80,
      effort: 4,
      ...(isAnimated ? { animated: true } : {}),
    })
    .toFile(output);
  generated++;
}

const dimensions = {};
for (const filename of byFilename.keys()) {
  const output = path.join(outputDirectory, `${path.parse(filename).name}.webp`);
  const metadata = await sharp(output).metadata();
  if (metadata.width && metadata.height) {
    dimensions[filename] = { width: metadata.width, height: metadata.height };
  }
}
await writeFile(
  path.resolve('src/data/media-dimensions.json'),
  `${JSON.stringify(dimensions, null, 2)}\n`,
);

console.log(`Media tối ưu: ${generated} tạo mới, ${reused} tái sử dụng, ${byFilename.size} file.`);
