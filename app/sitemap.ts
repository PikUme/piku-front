import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.pikume.com';

  // 정적 페이지들
  const staticRoutes: Array<{
    path: string;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
  }> = [
    { path: '', changeFrequency: 'daily', priority: 1.0 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/signup', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/password-reset', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/feed', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/friends', changeFrequency: 'daily', priority: 0.7 },
    { path: '/search', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/notifications', changeFrequency: 'daily', priority: 0.5 },
    { path: '/settings', changeFrequency: 'monthly', priority: 0.4 },
  ];

  // 동적 라우트 (/diary/[id], /profile/[userId] 등)는 런타임 데이터가 필요하므로 제외

  const now = new Date();

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}




