import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/common/LayoutWrapper";
import ReactQueryProvider from "@/providers/ReactQueryProvider";

// === 절대 URL 고정 (마지막 슬래시 제거) ===
const BASE_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.pikume.com").replace(/\/+$/, "");
const BRAND_ALTERNATE_NAMES = ["피쿠미", "PikUme", "pikume"];

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 절대 기준 URL
  metadataBase: new URL(BASE_URL),

  // 기본 메타
  title: {
    default: "PikUme - 캐릭터 감정 다이어리",
    template: "%s | PikUme",
  },
  description: "PIKU 캐릭터로 기록하는 감정 다이어리. 캐릭터와 함께 하루 한 장 일기를 작성하고 친구들과 감정을 공유해보세요.",
  keywords: [
    "감정 다이어리", "캐릭터 일기", "PIKU", "피쿠미", "PikUme", "pikume",
    "일기 앱", "감정 기록", "친구 다이어리", "캐릭터 선택", "일상 기록", 
    "모바일 다이어리", "웹 다이어리", "소셜 다이어리"
  ],
  authors: [{ name: "PikUme Team" }],
  creator: "PikUme Team",
  publisher: "PikUme",
  category: "Lifestyle",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification":
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "",
    },
  },

  referrer: "origin-when-cross-origin",

  // 아이콘/매니페스트도 절대 URL 사용 (안전)
  icons: {
    icon: [
      { url: `${BASE_URL}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${BASE_URL}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: `${BASE_URL}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: `/site.webmanifest`,

  // PWA: iOS
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PikUme",
  },

  // === Open Graph ===
  openGraph: {
    type: "website",
    siteName: "PikUme",
    title: "PikUme - 캐릭터 감정 다이어리",
    description: "PIKU 캐릭터로 기록하는 감정 다이어리. 캐릭터와 함께 하루 한 장 일기를 작성하고 친구들과 감정을 공유해보세요.",
    locale: "ko_KR",
  },

  // === Twitter Card ===
  twitter: {
    card: "summary_large_image",
    title: "PikUme - 캐릭터 감정 다이어리",
    description: "PIKU 캐릭터로 기록하는 감정 다이어리. 캐릭터와 함께 하루 한 장 일기를 작성하고 친구들과 감정을 공유해보세요.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PZBS35WR');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body className="antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PZBS35WR"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        <ReactQueryProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ReactQueryProvider>

        {/* WebSite 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: BASE_URL,
              name: "PikUme",
              alternateName: BRAND_ALTERNATE_NAMES,
              description: "캐릭터로 기록하는 감정 다이어리",
              keywords: "감정 다이어리, 캐릭터 일기, PIKU, 일기 앱, 피쿠미, 피쿠미 일기, 피쿠미 다이어리",
              potentialAction: {
                "@type": "SearchAction",
                target: `${BASE_URL}/search?query={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
              mainEntity: {
                "@type": "WebApplication",
                name: "PikUme",
                applicationCategory: "LifestyleApplication",
                operatingSystem: "Web, iOS, Android",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "KRW",
                },
              },
            }),
          }}
        />

        {/* Organization 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PikUme",
              alternateName: BRAND_ALTERNATE_NAMES,
              url: BASE_URL,
              logo: `${BASE_URL}/android-chrome-512x512.png`,
              description: "감정 기록을 위한 캐릭터 다이어리 서비스",
              foundingDate: "2024",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Customer Service",
                availableLanguage: "Korean",
              },
              sameAs: [
                `${BASE_URL}`,
              ],
            }),
          }}
        />

        {/* WebApplication 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PikUme",
              alternateName: BRAND_ALTERNATE_NAMES,
              description: "선택한 캐릭터와 함께 감정을 기록하는 다이어리 앱",
              url: BASE_URL,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web Browser",
              browserRequirements: "Requires JavaScript",
              screenshot: `${BASE_URL}/piku-og-1200x630.png`,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
                availability: "https://schema.org/InStock",
              },
              author: {
                "@type": "Organization",
                name: "PikUme Team",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.5",
                ratingCount: "100",
                bestRating: "5",
                worstRating: "1",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
