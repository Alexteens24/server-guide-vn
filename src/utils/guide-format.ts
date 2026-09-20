export const headingOverrides: Record<string, string> = {
  'glossary': '0. Mục lục & thuật ngữ',
  'intro': '1. Mở đầu',
  'preparation': '2. Chuẩn bị',
  'setup': '3. Thiết đặt',
  '-2-0-essential-tools-knowledge-cong-cu-kien-thuc-co-ban-can-thiet': '2.0. Công cụ & kiến thức nền tảng',
  '-2-1-server-software-jar-phan-mem-may-chu': '2.1. Phần mềm máy chủ (server JAR)',
  'hosting': '2.2. Hosting — Chạy máy chủ ở đâu?',
  '-2-2-1-luu-tam-ve-host-nuoc-ngoai-host-viet-nam': '2.2.1. Lưu ý về host nước ngoài và host Việt Nam',
  '-2-2-2-choosing-a-host-lua-chon-noi-dat-may-chu': '2.2.2. Lựa chọn nơi đặt máy chủ',
  '-dedicated-server-ca-1-may-chu-vat-ly-rieng-danh-cho-ban': 'Dedicated server — Máy chủ vật lý riêng',
  '-arclight-mohist': 'Arclight / Mohist',
  '-2-3-human-doi-tac-cong-tac-vien-nhan-su-suc-va-t': '2.3. Nhân sự — Đối tác và cộng tác viên',
  'integrations': '4. Tích hợp hệ thống nâng cao',
  '-3-0-tai-nguyen-tham-khao': '3.0. Tài nguyên tham khảo',
  '-3-1-giai-thich-cac-khai-niem-va-ly-do-minh-dat-vay': '3.1. Khái niệm và lý do thiết đặt',
  '-3-1-1-jvm-startup-flags-co-jvm-phu-hop': '3.1.1. JVM startup flags — Cờ JVM phù hợp',
  '-3-1-2-fundamentals-nen-tang': '3.1.2. Fundamentals — Nền tảng',
  '-3-2-server-properties-thiet-dat-can-thiet': '3.2. server.properties — thiết đặt cần thiết',
  '-3-3-bukkit-yml-thiet-dat-can-thiet': '3.3. bukkit.yml — thiết đặt cần thiết',
  '-3-4-spigot-yml-thiet-dat-can-thiet': '3.4. spigot.yml — thiết đặt cần thiết',
  '-3-5-paper-configs-tep-thiet-dat-can-thiet': '3.5. Cấu hình Paper',
  '-%CB%96-%E1%B5%8E%E1%B5%8E-3-5-1-paper-world-defaults-yml': '3.5.1. paper-world-defaults.yml',
  '-%CB%96-%E1%B5%8E%E1%B5%8E-3-5-2-paper-global-yml': '3.5.2. paper-global.yml',
  '-3-6-purpur-yml-thiet-dat-can-thiet': '3.6. purpur.yml — thiết đặt cần thiết',
  '-3-7-leaf-global-yml': '3.7. leaf-global.yml',
  '-3-8-config-gale-world-defaults-yml-thiet-dat-can-thiet': '3.8. gale-world-defaults.yml — thiết đặt cần thiết',
  '-3-8-config-gale-global-yml': '3.8. gale-global.yml',
  '-4-1-plugins-sm': '4.1. Plugin',
  '-4-2-datapack-goi-du-lieu': '4.2. Datapack — Gói dữ liệu',
  '-4-3-phan-tich-nhung-pha-tu-huy-kinh-dien-cua-quan-tri-vien-may-chu': '4.3. Sai lầm quản trị thường gặp',
  '-4-4-website-huu-ich': '4.4. Website hữu ích',
  '-4-5-tai-nguyen-ngau-nhien-minh-thay-ngau-det-trong-qua-trinh-xay-dung-bai-viet-nay-awesome-minecraft': '4.5. Tài nguyên ngẫu nhiên',
  'free-options': '5. Em không có tiền mua Plugins + thiết đặt xịn anh ơi!',
  'operations': '6. Lưu ý nhỏ của những người đi trước nè~',
  'next': '7. Sau 1–3 tháng, rồi sao?',
  'references': '8. Tài liệu tham khảo',
};

export function normalizeHeadingTitle(id: string, value: string) {
  return (headingOverrides[id] ?? value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[˚˖\sᵎ]+/u, '')
    .replace(/\s+-\s+/g, ' — ')
    .replace(/PAPER-WORLD-DEFAULTS\.YML/gi, 'paper-world-defaults.yml')
    .replace(/PAPER-GLOBAL\.YML/gi, 'paper-global.yml')
    .replace(/\.YML\b/g, '.yml')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeOutlineTitle(id: string, value: string) {
  return normalizeHeadingTitle(id, value).replace(/^(\d+(?:\.\d+){0,2})\.?\s*/, '$1 · ');
}

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

export function predictMarkdownHeading(id: string, level: number, title: string): string {
  const normalized = normalizeHeadingTitle(id, title);
  const prefix = '#'.repeat(Math.max(1, Math.min(level, 6)));
  const anchor = id ? ` {#${id}}` : '';
  return `${prefix} ${normalized}${anchor}`;
}

export function predictMarkdownOutline(outline: HeadingOutline[]): string {
  return outline
    .map((item) => predictMarkdownHeading(item.id || '', item.level, item.title))
    .join('\n');
}
