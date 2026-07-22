import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await readFile('src/data/media.json', 'utf8'));
const failures = [];
const files = new Set();

for (const item of manifest.items) {
  if (item.status !== 'downloaded' || !item.filename) {
    failures.push(`#${item.order}: chưa tải được ${item.source}`);
    continue;
  }
  files.add(item.filename);
}

for (const filename of files) {
  try {
    await access(path.join('public/media/source', filename));
  } catch {
    failures.push(`Thiếu file: ${filename}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(
  `Media hợp lệ: ${manifest.occurrenceCount} vị trí, ${files.size} file, nguồn post #${manifest.postId}.`,
);
