import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeHeadingTitle } from './guide-format.mjs';

const guidePath = path.resolve('src/data/guide-pages.json');
const fragmentsPath = path.resolve('src/data/chapter-fragments.json');
const outputPath = path.resolve('src/data/sidebar-data.json');

const guide = JSON.parse(await readFile(guidePath, 'utf8'));
const fragments = JSON.parse(await readFile(fragmentsPath, 'utf8'));

const fragmentById = Object.fromEntries(fragments.items.map((f) => [f.id, f]));
const childrenByParent = Object.groupBy(
  guide.pages.filter((page) => page.parent),
  (page) => page.parent || '',
);

const chapters = guide.pages.filter((page) => !page.parent);

function parseNumberParts(number) {
  const parts = number.split('.').map((p) => parseInt(p, 10));
  return parts;
}

function isSubsectionOf(number, parentNumber) {
  const numParts = parseNumberParts(number);
  const parentParts = parseNumberParts(parentNumber);
  if (numParts.length <= parentParts.length) return false;
  for (let i = 0; i < parentParts.length; i++) {
    if (numParts[i] !== parentParts[i]) return false;
  }
  return true;
}

function getSectionFromFragment(fragmentId, sectionNumber) {
  const fragment = fragmentById[fragmentId];
  if (!fragment?.outline) return null;
  const parts = parseNumberParts(sectionNumber);
  for (const item of fragment.outline) {
    if (item.level === 3 && item.title.startsWith(sectionNumber)) return item;
    if (parts.length >= 2 && item.level === 3 && item.title.startsWith(`${parts[0]}.${parts[1]}`)) {
      return item;
    }
  }
  return null;
}

function extractSubsections(fragmentId, sectionNumber) {
  const fragment = fragmentById[fragmentId];
  if (!fragment?.outline) return [];
  const subs = [];
  const parts = parseNumberParts(sectionNumber);
  let inSection = false;
  for (const item of fragment.outline) {
    if (item.level === 3) {
      inSection = item.title.startsWith(sectionNumber) ||
        (parts.length >= 2 && item.title.startsWith(`${parts[0]}.${parts[1]}`));
    } else if (item.level >= 4 && inSection) {
      subs.push({
        id: item.id,
        title: normalizeHeadingTitle(item.id, item.title).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, ''),
        targetId: item.id,
      });
    }
  }
  return subs;
}

function getSubSections(chapter) {
  const children = childrenByParent[chapter.id] || [];
  const sections = [];

  if (chapter.fragment) {
    const fragment = fragmentById[chapter.fragment];
    if (fragment && fragment.outline) {
      const subItems = fragment.outline
        .filter((h) => h.level === 3 && h.id)
        .map((h) => {
          const subs = extractSubsectionsFromOutline(fragment.outline, h);
          const numMatch = h.title.match(/^(\d+(?:\.\d+)*)/);
          return {
            id: h.id,
            number: numMatch ? numMatch[1] : '',
            title: normalizeHeadingTitle(h.id, h.title).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, ''),
            targetId: h.id,
            subsections: subs,
          };
        });
      if (subItems.length > 0) {
        sections.push(...subItems);
      }
    }
  }

  if (children.length > 0) {
    const grouped = {};
    const standalone = [];

    for (const child of children) {
      const numParts = parseNumberParts(child.number);
      if (numParts.length >= 3) {
        const groupKey = `${numParts[0]}.${numParts[1]}`;
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(child);
      } else {
        standalone.push(child);
      }
    }

    for (const child of standalone) {
      const title = normalizeHeadingTitle(child.id, child.title);
      const targetId = child.fragment
        ? (fragmentById[child.fragment]?.firstHeadingId || child.fragment)
        : child.id;
      const subsections = child.fragment
        ? extractSubsections(child.fragment, child.number)
        : [];
      sections.push({
        id: child.id,
        number: child.number,
        title,
        targetId,
        subsections,
      });
    }

    for (const [groupKey, groupChildren] of Object.entries(grouped)) {
      const groupTitle = findSectionTitleByNumber(chapter, groupKey, groupChildren);
      const groupTarget = groupChildren[0]?.fragment
        ? (fragmentById[groupChildren[0].fragment]?.firstHeadingId || null)
        : null;

      const childSections = groupChildren.map((child) => {
        const title = normalizeHeadingTitle(child.id, child.title);
        const targetId = child.fragment
          ? (fragmentById[child.fragment]?.firstHeadingId || child.fragment)
          : child.id;
        const subsections = child.fragment
          ? extractSubsections(child.fragment, child.number)
          : [];
        return {
          id: child.id,
          number: child.number,
          title,
          targetId,
          subsections,
        };
      });

      sections.push({
        id: chapter.id + '-' + groupKey,
        number: groupKey,
        title: groupTitle,
        targetId: groupTarget,
        isGroup: true,
        children: childSections,
      });
    }
  }

  return sections;
}

function findSectionTitleByNumber(chapter, number, groupChildren) {
  const fragments = groupChildren
    .filter((c) => c.fragment)
    .map((c) => fragmentById[c.fragment])
    .filter(Boolean);

  for (const frag of fragments) {
    for (const item of frag.outline) {
      if (item.level === 3 && item.title.startsWith(number)) {
          return normalizeHeadingTitle(item.id, item.title).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, '');
      }
    }
  }

  return groupChildren[0]?.title || number;
}

function extractSubsectionsFromOutline(outline, sectionHeading) {
  const subs = [];
  const sectionId = sectionHeading.id;
  let capturing = false;
  for (const item of outline) {
    if (item.level === 3 && item.id === sectionId) {
      capturing = true;
      continue;
    }
    if (item.level === 3 && capturing) {
      break;
    }
    if (capturing && item.level >= 4 && item.id) {
      subs.push({
        id: item.id,
        title: normalizeHeadingTitle(item.id, item.title).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, ''),
        targetId: item.id,
      });
    }
  }
  return subs;
}

const chapterTree = chapters.map((chapter) => ({
  ...chapter,
  targetId: chapter.fragment
    ? (fragmentById[chapter.fragment]?.firstHeadingId || chapter.id)
    : chapter.id,
  sections: getSubSections(chapter),
}));

await writeFile(outputPath, JSON.stringify(chapterTree, null, 2) + '\n');
console.log('Generated sidebar-data.json with', chapterTree.length, 'chapters');
for (const chapter of chapterTree) {
  const directSections = chapter.sections.filter((s) => !s.isGroup);
  const groupedSections = chapter.sections.filter((s) => s.isGroup);
  console.log(`  ${chapter.number}. ${chapter.title}: ${directSections.length} sections, ${groupedSections.length} groups`);
}
