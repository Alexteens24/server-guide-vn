import * as cheerio from 'cheerio';
import path from 'node:path';
import media from '../data/media.json';

const knownFiles = new Set(
  media.items
    .filter((item) => item.status === 'downloaded' && item.filename)
    .map((item) => item.filename as string),
);
const animatedFiles = new Set(
  media.items
    .filter((item) => item.status === 'downloaded' && item.filename && item.contentType === 'image/gif')
    .map((item) => item.filename as string),
);

export function optimizedMediaPath(filename: string, base: string) {
  return `${base}media/optimized/${path.parse(filename).name}.webp`;
}

export function optimizeEmbeddedMedia(html: string, base: string) {
  const resolved = html.replaceAll('__BASE__', base);
  const $ = cheerio.load(resolved, {}, false);
  $('img[src*="media/source/"]').each((_, element) => {
    const image = $(element);
    const src = image.attr('src') || '';
    const filename = decodeURIComponent(src.split('/').pop() || '');
    if (!knownFiles.has(filename)) return;

    const original = `${base}media/source/${filename}`;
    image.attr('src', optimizedMediaPath(filename, base));
    image.attr('data-original-src', original);
    image.attr('loading', 'lazy');
    image.attr('decoding', 'async');
    image.addClass('optimized-media');
    if (animatedFiles.has(filename)) {
      image.addClass('optimized-media--animated');
      image.attr('title', image.attr('title') || 'Mở ảnh động gốc');
    }

    const parentLink = image.closest('a');
    if (parentLink.length) {
      if (/media\/(?:source|optimized)\//.test(parentLink.attr('href') || '')) parentLink.attr('href', original);
      return;
    }
    if (!image.hasClass('smilie')) {
      const label = image.attr('alt')?.trim() || image.attr('title')?.trim() || 'Mở ảnh gốc';
      image.wrap(`<a class="optimized-media-link" href="${original}" target="_blank" rel="noreferrer" aria-label="${label.replaceAll('"', '&quot;')}"></a>`);
    }
  });
  return $.html();
}
