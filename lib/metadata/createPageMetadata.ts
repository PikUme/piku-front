import type { Metadata } from 'next';

export const SITE_NAME = 'PikUme';
export const DEFAULT_LOCALE = 'ko_KR';
export const DEFAULT_SHARE_IMAGE_ALT = 'PikUme - 캐릭터 감정 다이어리';
export const DEFAULT_SHARE_IMAGE_WIDTH = 1200;
export const DEFAULT_SHARE_IMAGE_HEIGHT = 630;
export const DEFAULT_SHARE_IMAGE_TYPE = 'image/png';

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}`;
  keywords?: Metadata['keywords'];
  socialTitle?: string;
  socialDescription?: string;
};

export const createPageMetadata = ({
  title,
  description,
  path,
  keywords,
  socialTitle = title,
  socialDescription = description,
}: PageMetadataOptions): Metadata => ({
  title,
  description,
  ...(keywords ? { keywords } : {}),
  alternates: {
    canonical: path,
  },
  openGraph: {
    title: socialTitle,
    description: socialDescription,
    type: 'website',
    url: path,
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
    images: [
      {
        url: '/opengraph-image.png',
        width: DEFAULT_SHARE_IMAGE_WIDTH,
        height: DEFAULT_SHARE_IMAGE_HEIGHT,
        alt: DEFAULT_SHARE_IMAGE_ALT,
        type: DEFAULT_SHARE_IMAGE_TYPE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description: socialDescription,
    images: [
      {
        url: '/twitter-image.png',
        width: DEFAULT_SHARE_IMAGE_WIDTH,
        height: DEFAULT_SHARE_IMAGE_HEIGHT,
        alt: DEFAULT_SHARE_IMAGE_ALT,
        type: DEFAULT_SHARE_IMAGE_TYPE,
      },
    ],
  },
});
