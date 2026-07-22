# Lộ trình Server Minecraft

Trang tài liệu tiếng Việt về phát triển, vận hành và tối ưu máy chủ Minecraft cho người mới. Nội dung được biên tập từ [bài viết của Minh / TranNhatMinhxD trên MineVN](https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/).

## Chạy local

Yêu cầu Node.js 22.12 trở lên.

```bash
npm install
npm run dev
```

Kiểm tra bản production:

```bash
npm run media:verify
npm run build
npm run preview
```

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
