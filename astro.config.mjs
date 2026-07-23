import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import guide from './src/data/guide-pages.json' with { type: 'json' };
import fragments from './src/data/chapter-fragments.json' with { type: 'json' };

const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repo = ''] = repository.split('/');
const isUserSite = repo === `${owner}.github.io`;
const site = owner ? `https://${owner}.github.io` : 'http://localhost:4321';
const base = repo && !isUserSite ? `/${repo}` : '/';
const home = base === '/' ? '/' : `${base}/`;
const firstHeadingByFragment = new Map(
  fragments.items.map((fragment) => [fragment.id, fragment.firstHeadingId]),
);
const redirects = {
  ...Object.fromEntries(guide.pages.map((page) => [
    `/${page.slug}`,
    `${home}#${page.fragment ? firstHeadingByFragment.get(page.fragment) : page.id}`,
  ])),
  '/nguyen-tac': home,
  '/tim-kiem': home,
};

export default defineConfig({
  site,
  base,
  redirects,
  integrations: [
    starlight({
      title: 'Lộ trình Server Minecraft',
      description:
        'Lộ trình phát triển, vận hành và tối ưu hiệu năng máy chủ Minecraft dành cho người mới.',
      favicon: '/favicon.svg',
      disable404Route: true,
      defaultLocale: 'root',
      locales: {
        root: { label: 'Tiếng Việt', lang: 'vi' },
      },
      lastUpdated: true,
      social: [
        {
          icon: 'github',
          label: 'Mã nguồn trên GitHub',
          href: 'https://github.com/Alexteens24/server-guide-vn',
        },
        {
          icon: 'open-book',
          label: 'Bài viết gốc trên MineVN',
          href: 'https://minevn.net/threads/lo-trinh-huong-dan-phat-trien-toi-uu-hieu-nang-may-chu-minecraft-danh-cho-nguoi-moi.52423/',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        Head: './src/components/GuideHead.astro',
        SiteTitle: './src/components/SiteTitle.astro',
        Sidebar: './src/components/ChapterSidebar.astro',
      },
      sidebar: [{ label: 'Toàn bộ lộ trình', link: '/' }],
      tableOfContents: false,
    }),
  ],
});
