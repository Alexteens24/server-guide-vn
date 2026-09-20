import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { normalizeHeadingTitle } from './guide-format.mjs';

const fragmentsPath = path.resolve('src/data/chapter-fragments.json');
const chaptersDir = path.resolve('src/data/chapters');

const manifest = JSON.parse(await readFile(fragmentsPath, 'utf8'));

for (const fragment of manifest.items) {
  const fragmentPath = path.join(chaptersDir, fragment.filename);
  const html = await readFile(fragmentPath, 'utf8');
  const $ = cheerio.load(html, {}, false);

  fragment.outline = $('h2,h3,h4').map((_, element) => ({
    id: $(element).attr('id') || null,
    level: Number(element.tagName.slice(1)),
    title: normalizeHeadingTitle(
      $(element).attr('id') || '',
      $(element).text().replace(/\s+/g, ' ').trim(),
    ),
  })).get().filter((item) => item.id && item.title);
}

await writeFile(fragmentsPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log('Regenerated outline for', manifest.items.length, 'fragments');
for (const fragment of manifest.items) {
  console.log(`  ${fragment.id}: ${fragment.outline.length} headings`);
  for (const item of fragment.outline) {
    console.log(`    H${item.level} [${item.id}]: ${item.title}`);
  }
}
