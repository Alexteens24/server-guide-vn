# Lộ trình Server Minecraft

Trang tài liệu tiếng Việt về phát triển, vận hành và tối ưu máy chủ Minecraft cho người mới. Nội dung từ [bài viết của Minh / TranNhatMinhxD trên MineVN](https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/) được giữ nguyên thứ tự và trình bày trong một trang duy nhất.

## Chạy local

Yêu cầu Node.js 22.12 trở lên.

```bash
npm install
npm run dev
```

Kiểm tra bản production:

```bash
npm run verify
npm run preview
```

Kiểm thử giao diện và ngân sách chất lượng:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:perf
```

## Cấu trúc nội dung

Guide dùng cấu trúc single-page. Mục lục ở thanh bên và đầu bài đều trỏ tới anchor trong bài nguyên tác; các URL chương cũ redirect về đúng phần tương ứng. Giao diện không có tài khoản, checklist hoặc cơ chế lưu tiến độ.

Ảnh/GIF gốc vẫn nằm trong kho nguyên tác. `npm run media:optimize` sinh poster WebP vào thư mục bị Git bỏ qua để guide không tự tải media nặng; bấm ảnh sẽ mở file gốc.

## Media nguồn

`src/data/media.json` là manifest của 346 vị trí ảnh trong bài `#1`, tương ứng 269 file duy nhất nằm tại `public/media/source/`. Importer có thể chạy lại từ một HTML snapshot hoặc trực tiếp từ URL nguồn:

```bash
npm run media:import -- /path/to/minevn-guide.html
# hoặc
npm run media:import
```

Importer tái sử dụng file đã tải, thử fallback cho nguồn chặn hotlink và ghi lại URL gốc cho từng media. Chỉ chạy lệnh này khi có quyền tái bản nội dung nguồn.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` tự build khi push lên `main`. Astro suy ra `site` và `base` từ `GITHUB_REPOSITORY`, nên dùng được cho cả repository Pages (`/ten-repo/`) và user Pages (`username.github.io`).

## Giấy phép

Project sử dụng giấy phép theo từng phần:

- Mã nguồn website, Astro components, CSS/JavaScript/TypeScript, các script import/verify/optimize, GitHub Actions và cấu hình do project tạo được phát hành theo [MIT License](./LICENSE#website-software--mit-license).
- Nội dung bài hướng dẫn do **Minh — TranNhatMinhxD / bạngáitôiđátôi** viết được phát hành theo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Khi chia sẻ hoặc chỉnh sửa, cần ghi công Minh, dẫn nguồn bài gốc, dẫn giấy phép và nêu rõ các thay đổi.

Media, attachment, nội dung trích dẫn và tài sản của bên thứ ba không tự động thuộc hai giấy phép trên. Xem phạm vi và mẫu ghi công đầy đủ trong [LICENSE](./LICENSE).
