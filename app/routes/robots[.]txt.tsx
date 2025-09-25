// import type { Route } from "./+types/robots[.]txt";

export async function loader({ request }: { request: Request }) {
  const baseUrl = new URL(request.url).origin;
  
  const robotsTxt = `User-agent: *
Allow: /

# 관리자 페이지는 크롤링 금지
Disallow: /admin/
Disallow: /admin/*

# 검색 결과 페이지의 파라미터는 크롤링 제한
Disallow: /search?*

# Sitemap 위치
Sitemap: ${baseUrl}/sitemap.xml

# 주요 페이지들
Allow: /
Allow: /category/
Allow: /content/
Allow: /author/
Allow: /search

# 크롤링 속도 조절 (선택사항)
Crawl-delay: 1`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400" // 24시간 캐시
    }
  });
}