import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repo = ''] = repository.split('/');
const isUserSite = repo === `${owner}.github.io`;
const site = owner ? `https://${owner}.github.io` : 'http://localhost:4321';
const base = repo && !isUserSite ? `/${repo}` : '/';

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: 'Lộ trình Server Minecraft',
      description:
        'Lộ trình phát triển, vận hành và tối ưu hiệu năng máy chủ Minecraft dành cho người mới.',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Tiếng Việt', lang: 'vi' },
      },
      lastUpdated: true,
      social: [
        {
          icon: 'open-book',
          label: 'Bài viết gốc trên MineVN',
          href: 'https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        Sidebar: './src/components/ChapterSidebar.astro',
      },
      sidebar: [
        { label: 'Toàn bộ lộ trình', link: '/' },
      ],
      // Các fragment HTML có mục lục riêng được sinh từ manifest nội dung.
      tableOfContents: false,
    }),
  ],
});
