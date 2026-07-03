import type { Metadata } from 'next';
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

import RootLayout from './layout';
import { metadata as homeMetadata } from './page';

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

const getJsonLdData = (html: string) =>
  Array.from(
    html.matchAll(
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ).map((match) => JSON.parse(match[1]));

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
});
