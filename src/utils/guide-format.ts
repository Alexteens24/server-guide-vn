export const headingOverrides: Record<string, string> = {
  '-2-0-essential-tools-knowledge-cong-cu-kien-thuc-co-ban-can-thiet': '2.0. Công cụ & kiến thức nền tảng',
  '-2-1-server-software-jar-phan-mem-may-chu': '2.1. Phần mềm máy chủ (server JAR)',
  'hosting': '2.2. Hosting — Chạy máy chủ ở đâu?',
  '-2-2-1-luu-tam-ve-host-nuoc-ngoai-host-viet-nam': '2.2.1. Lưu ý về host nước ngoài và host Việt Nam',
  '-2-2-2-choosing-a-host-lua-chon-noi-dat-may-chu': '2.2.2. Lựa chọn nơi đặt máy chủ',
  '-dedicated-server-ca-1-may-chu-vat-ly-rieng-danh-cho-ban': 'Dedicated server — Máy chủ vật lý riêng',
  '-arclight-mohist': 'Arclight / Mohist',
  '-2-3-human-doi-tac-cong-tac-vien-nhan-su-suc-va-t': '2.3. Nhân sự — Đối tác và cộng tác viên',
  '-3-0-tai-nguyen-tham-khao': '3.0. Tài nguyên tham khảo',
  '-3-1-giai-thich-cac-khai-niem-va-ly-do-minh-dat-vay': '3.1. Khái niệm và lý do thiết đặt',
  '-3-5-paper-configs-tep-thiet-dat-can-thiet': '3.5. Cấu hình Paper',
  '-4-1-plugins-sm': '4.1. Plugin',
  '-4-2-datapack-goi-du-lieu': '4.2. Datapack — Gói dữ liệu',
  '-4-3-phan-tich-nhung-pha-tu-huy-kinh-dien-cua-quan-tri-vien-may-chu': '4.3. Sai lầm quản trị thường gặp',
  '-4-4-website-huu-ich': '4.4. Website hữu ích',
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
