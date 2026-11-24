export declare const headingOverrides: Record<string, string>;

export declare function normalizeHeadingTitle(id: string, value: string): string;
export declare function normalizeOutlineTitle(id: string, value: string): string;
export declare function predictMarkdownHeading(id: string, level: number, title: string): string;
export declare function predictMarkdownOutline(outline: HeadingOutline[]): string;
export declare function parseNumberParts(number: string): number[];
export declare function numberFromTitle(title: string): string;
export declare function findSubSectionHeadingId(
  fragment: { outline?: HeadingOutline[] } | null | undefined,
  sectionNumber: string,
): string | null;

export interface HeadingOutline {
  id: string | null;
  level: number;
  title: string;
}

export interface SidebarSubsection {
  id?: string;
  title: string;
  targetId: string;
}

export interface SidebarSection {
  id: string;
  number: string;
  title: string;
  targetId: string;
  subsections?: SidebarSubsection[];
  isGroup?: boolean;
  children?: SidebarSection[];
}

export interface SidebarChapter {
  id: string;
  number: string;
  title: string;
  slug?: string;
  fragment?: string;
  description?: string;
  targetId: string;
  sections: SidebarSection[];
}

export interface GuidePage {
  id: string;
  slug: string;
  number: string;
  title: string;
  description?: string;
  parent?: string;
  fragment?: string;
}
