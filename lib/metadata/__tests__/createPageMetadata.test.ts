import { describe, expect, it } from 'vitest';

import { createPageMetadata } from '../createPageMetadata';

describe('createPageMetadata', () => {
  it('페이지별 canonical, OG, Twitter 계약을 만든다', () => {
    const metadata = createPageMetadata({
      title: '피드 - PikUme | 친구들의 감정 다이어리 피드',
      description:
        '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
      path: '/feed',
      keywords: ['친구 피드', '감정 피드'],
    });

    expect(metadata.title).toBe('피드 - PikUme | 친구들의 감정 다이어리 피드');
    expect(metadata.description).toBe(
      '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
    );
    expect(metadata.keywords).toEqual(['친구 피드', '감정 피드']);
    expect(metadata.alternates?.canonical).toBe('/feed');
    expect(metadata.openGraph).toMatchObject({
      title: '피드 - PikUme | 친구들의 감정 다이어리 피드',
      description:
        '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
      type: 'website',
      url: '/feed',
      siteName: 'PikUme',
      locale: 'ko_KR',
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: '피드 - PikUme | 친구들의 감정 다이어리 피드',
      description:
        '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
    });
  });

  it('공유 카드 문구를 페이지 메타 문구와 분리할 수 있다', () => {
    const metadata = createPageMetadata({
      title: 'PikUme(피쿠미) - 캐릭터로 기록하는 감정 다이어리',
      description:
        'PikUme(피쿠미)는 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성하고 친구들과 감정을 공유하는 다이어리 서비스입니다.',
      path: '/',
      socialTitle: 'PikUme(피쿠미) - 캐릭터 감정 다이어리',
      socialDescription:
        'PikUme(피쿠미)에서 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
    });

    expect(metadata.title).toBe(
      'PikUme(피쿠미) - 캐릭터로 기록하는 감정 다이어리',
    );
    expect(metadata.description).toBe(
      'PikUme(피쿠미)는 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성하고 친구들과 감정을 공유하는 다이어리 서비스입니다.',
    );
    expect(metadata.openGraph?.title).toBe(
      'PikUme(피쿠미) - 캐릭터 감정 다이어리',
    );
    expect(metadata.openGraph?.description).toBe(
      'PikUme(피쿠미)에서 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
    );
    expect(metadata.twitter?.title).toBe(
      'PikUme(피쿠미) - 캐릭터 감정 다이어리',
    );
    expect(metadata.twitter?.description).toBe(
      'PikUme(피쿠미)에서 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
    );
  });

  it('모든 페이지 공유 카드에 공통 이미지를 포함한다', () => {
    const metadata = createPageMetadata({
      title: '검색 - PikUme',
      description: 'PikUme에서 친구를 찾고 감정 다이어리를 검색해보세요.',
      path: '/search',
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'PikUme - 캐릭터 감정 다이어리',
        type: 'image/png',
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      {
        url: '/twitter-image.png',
        width: 1200,
        height: 630,
        alt: 'PikUme - 캐릭터 감정 다이어리',
        type: 'image/png',
      },
    ]);
  });
});
