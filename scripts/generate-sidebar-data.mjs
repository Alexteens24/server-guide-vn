import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const guidePath = path.resolve('src/data/guide-pages.json');
const fragmentsPath = path.resolve('src/data/chapter-fragments.json');
const outputPath = path.resolve('src/data/sidebar-data.json');

const guide = JSON.parse(await readFile(guidePath, 'utf8'));
const fragments = JSON.parse(await readFile(fragmentsPath, 'utf8'));

const childrenByParent = Object.groupBy(
  guide.pages.filter((page) => page.parent),
  (page) => page.parent || '',
);

const fragmentById = Object.fromEntries(fragments.items.map((f) => [f.id, f]));

const chapters = guide.pages.filter((page) => !page.parent);

function firstHeadingId(fragmentId) {
  return fragmentById[fragmentId]?.firstHeadingId || null;
}

function groupOutline(outline) {
  const result = [];
  let currentParent = null;
  outline.forEach((item) => {
    if (!item.id || !item.title) return;
    if (item.level === 3) {
      currentParent = { id: item.id, title: item.title, targetId: item.id, children: [] };
      result.push(currentParent);
    } else if (item.level >= 4 && currentParent) {
      currentParent.children.push({ id: item.id, title: item.title });
    } else if (item.level === 2) {
      result.push({ id: item.id, title: item.title, targetId: item.id, children: [] });
    }
  });
  return result;
}

function getSubSections(chapter) {
  const children = childrenByParent[chapter.id] || [];
  const sections = [];

  if (chapter.fragment) {
    const fragment = fragmentById[chapter.fragment];
    if (fragment && fragment.outline) {
      const subItems = fragment.outline.slice(1).filter((h) => h.level >= 3);
      if (subItems.length > 0) {
        sections.push(...groupOutline(subItems));
      }
    }
  }

  children.forEach((child) => {
    const targetId = child.fragment
      ? (firstHeadingId(child.fragment) || child.fragment)
      : child.id;
    sections.push({
      id: child.id,
      title: child.number + '. ' + child.title,
      targetId: targetId,
      children: [],
    });
  });

  return sections;
}

const chapterTree = chapters.map((chapter) => ({
  ...chapter,
  subSections: getSubSections(chapter),
}));

await writeFile(outputPath, JSON.stringify(chapterTree, null, 2) + '\n');
console.log('Generated sidebar-data.json with', chapterTree.length, 'chapters');
for (const chapter of chapterTree) {
  console.log(`  ${chapter.number}. ${chapter.title}: ${chapter.subSections.length} sub-sections`);
}
