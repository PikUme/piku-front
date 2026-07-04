import type { Metadata } from 'next';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

vi.mock('@/components/common/LayoutWrapper', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/ReactQueryProvider', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/home/HomeRoot', () => ({
  default: () => <main />,
}));

vi.mock('@/components/feed/FeedClient', () => ({
  default: () => <main />,
}));

vi.mock('@/components/auth/PasswordResetClient', () => ({
  default: () => <main />,
}));

import RootLayout, { metadata as rootMetadata } from './layout';
import { metadata as feedMetadata } from './feed/page';
import { metadata as homeMetadata } from './page';
import { metadata as passwordResetMetadata } from './password-reset/page';

const getTitleText = (title: Metadata['title']) => {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'default' in title) {
    return String(title.default);
  }
  return '';
};

const getStringArray = (value: Metadata['keywords']) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
};

const getCanonical = (metadata: Metadata) => {
  const canonical = metadata.alternates?.canonical as unknown;
  if (!canonical) return undefined;
  if (typeof canonical === 'string') return canonical;
  if (canonical instanceof URL) return canonical.toString();
  if (typeof canonical === 'object' && 'url' in canonical) {
    return String((canonical as { url: unknown }).url);
  }
  return String(canonical);
};

const getOpenGraphUrl = (metadata: Metadata) => {
  const openGraph = metadata.openGraph;
  if (!openGraph || !('url' in openGraph)) return undefined;
  const url = openGraph.url;
  return url instanceof URL ? url.toString() : url;
};

const getTwitterCard = (metadata: Metadata) => {
  const twitter = metadata.twitter;
  if (!twitter || !('card' in twitter)) return undefined;
  return twitter.card;
};

const getJsonLdData = (html: string) =>
  Array.from(
    html.matchAll(
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ).map((match) => JSON.parse(match[1]));

const readPngSize = (filePath: string) => {
  const buffer = readFileSync(filePath);
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  expect(Array.from(buffer.subarray(0, 8))).toEqual(pngSignature);

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

describe('SEO metadata', () => {
  it('홈 메타데이터가 피쿠미 브랜드 별칭을 제공한다', () => {
    expect(getTitleText(homeMetadata.title)).toContain('피쿠미');
    expect(homeMetadata.description).toContain('PikUme(피쿠미)');
    expect(getStringArray(homeMetadata.keywords)).toEqual(
      expect.arrayContaining(['피쿠미', '피쿠미 일기', '피쿠미 다이어리']),
    );
    expect(homeMetadata.openGraph?.title).toContain('피쿠미');
    expect(homeMetadata.twitter?.title).toContain('피쿠미');
  });

  it('구조화 데이터가 PikUme와 피쿠미를 같은 브랜드 별칭으로 연결한다', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main />
      </RootLayout>,
    );
    const jsonLdData = getJsonLdData(html);
    const brandTypes = ['WebSite', 'Organization', 'WebApplication'];

    for (const type of brandTypes) {
      const schema = jsonLdData.find((item) => item['@type'] === type);
      expect(schema?.alternateName).toEqual(
        expect.arrayContaining(['피쿠미', 'PikUme', 'pikume']),
      );
    }
  });

  it('루트는 경로 종속 URL을 갖지 않고 공개 페이지는 자기 URL을 가진다', () => {
    expect(getCanonical(rootMetadata)).toBeUndefined();
    expect(getOpenGraphUrl(rootMetadata)).toBeUndefined();

    expect(getCanonical(homeMetadata)).toBe('/');
    expect(getOpenGraphUrl(homeMetadata)).toBe('/');
    expect(getTwitterCard(homeMetadata)).toBe('summary_large_image');

    expect(getCanonical(feedMetadata)).toBe('/feed');
    expect(getOpenGraphUrl(feedMetadata)).toBe('/feed');
    expect(getTwitterCard(feedMetadata)).toBe('summary_large_image');

    expect(getCanonical(passwordResetMetadata)).toBe('/password-reset');
    expect(getOpenGraphUrl(passwordResetMetadata)).toBe('/password-reset');
    expect(getTwitterCard(passwordResetMetadata)).toBe('summary_large_image');
  });

  it('파일 기반 OG와 Twitter 이미지를 1200x630 PNG로 제공한다', () => {
    const assetCases = [
      {
        imagePath: path.join(process.cwd(), 'app/opengraph-image.png'),
        altPath: path.join(process.cwd(), 'app/opengraph-image.alt.txt'),
      },
      {
        imagePath: path.join(process.cwd(), 'app/twitter-image.png'),
        altPath: path.join(process.cwd(), 'app/twitter-image.alt.txt'),
      },
    ];

    for (const { imagePath, altPath } of assetCases) {
      expect(existsSync(imagePath)).toBe(true);
      expect(readPngSize(imagePath)).toEqual({ width: 1200, height: 630 });
      expect(existsSync(altPath)).toBe(true);
      expect(readFileSync(altPath, 'utf8')).toContain('PikUme');
    }
  });
});
