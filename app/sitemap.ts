import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.pikume.com';

  // 정적 페이지들 (로그인 불필요 + 주요 페이지들)
  const staticRoutes: string[] = [
    '',
    '/login',
    '/signup',
    '/password-reset',
    '/feed',
    '/friends',
    '/search',
    '/notifications',
    '/settings',
    '/profile',
    '/profile/edit',
  ];

  const now = new Date();

  return staticRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/feed' ? 0.8 : 0.6,
  }));
}



