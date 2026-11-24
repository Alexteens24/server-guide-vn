import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  findSubSectionHeadingId,
  normalizeHeadingTitle,
  numberFromTitle,
  parseNumberParts,
} from '../src/lib/guide-format.mjs';

const guidePath = path.resolve('src/data/guide-pages.json');
const fragmentsPath = path.resolve('src/data/chapter-fragments.json');
const originalPostPath = path.resolve('src/data/original-post.html');
const outputPath = path.resolve('src/data/sidebar-data.json');

const guide = JSON.parse(await readFile(guidePath, 'utf8'));
const fragments = JSON.parse(await readFile(fragmentsPath, 'utf8'));
const originalPost = await readFile(originalPostPath, 'utf8');
const originalPostIds = new Set(
  [...originalPost.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
);

const fragmentById = Object.fromEntries(fragments.items.map((f) => [f.id, f]));
const childrenByParent = Object.groupBy(
  guide.pages.filter((page) => page.parent),
  (page) => page.parent || '',
);

const chapters = guide.pages.filter((page) => !page.parent);

const missingTargets = new Set();

function resolveTarget(fragmentId, sectionNumber, fallback) {
  const resolved =
    findSubSectionHeadingId(fragmentById[fragmentId], sectionNumber) ??
    fragmentById[fragmentId]?.firstHeadingId ??
    fallback;
  if (resolved && !originalPostIds.has(resolved)) missingTargets.add(`${fragmentId} → ${resolved}`);
  return resolved;
}

function isNumericHeading(title) {
  return /^(\d+(?:\.\d+)*)/.test(title);
}

function extractSubsections(fragmentId, sectionNumber) {
  const fragment = fragmentById[fragmentId];
  if (!fragment?.outline) return [];
  const subs = [];
  const parts = parseNumberParts(sectionNumber);
  let inSection = false;
  for (const item of fragment.outline) {
    if (item.level === 3) {
      if (isNumericHeading(item.title)) {
        inSection = item.title.startsWith(sectionNumber) ||
          (parts.length >= 2 && item.title.startsWith(`${parts[0]}.${parts[1]}`));
      }
    } else if (item.level >= 4) {
      if (!inSection && item.title.startsWith(sectionNumber)) {
        inSection = true;
      }
      if (inSection) {
        subs.push({
          id: item.id,
          title: normalizeHeadingTitle(item.id, item.title).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, ''),
          targetId: item.id,
        });
      }
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
          return {
            id: h.id,
            number: numberFromTitle(h.title),
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
        ? resolveTarget(child.fragment, child.number, child.fragment)
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
      const groupTitle = findSectionTitleByNumber(groupKey, groupChildren);
      const groupTarget = groupChildren[0]?.fragment
        ? resolveTarget(groupChildren[0].fragment, groupKey, groupChildren[0].fragment)
        : null;

      const childSections = groupChildren.map((child) => {
        const title = normalizeHeadingTitle(child.id, child.title);
        const targetId = child.fragment
          ? resolveTarget(child.fragment, child.number, child.fragment)
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

  sections.sort((a, b) => {
    const aParts = parseNumberParts(a.number);
    const bParts = parseNumberParts(b.number);
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i++) {
      const aVal = aParts[i] ?? 0;
      const bVal = bParts[i] ?? 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });

  return sections;
}

function findSectionTitleByNumber(number, groupChildren) {
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
      if (isNumericHeading(item.title)) break;
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
    ? resolveTarget(chapter.fragment, chapter.number, chapter.id)
    : chapter.id,
  sections: getSubSections(chapter),
}));

if (missingTargets.size) {
  console.error(
    `Sidebar trỏ tới anchor không có trong original-post.html:\n${[...missingTargets]
      .map((entry) => `  ${entry}`)
      .join('\n')}`,
  );
  process.exit(1);
}

await writeFile(outputPath, JSON.stringify(chapterTree, null, 2) + '\n');
console.log('Generated sidebar-data.json with', chapterTree.length, 'chapters');
for (const chapter of chapterTree) {
  const directSections = chapter.sections.filter((s) => !s.isGroup);
  const groupedSections = chapter.sections.filter((s) => s.isGroup);
  console.log(`  ${chapter.number}. ${chapter.title}: ${directSections.length} sections, ${groupedSections.length} groups`);
}
