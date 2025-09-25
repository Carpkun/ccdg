import { createSupabaseServerClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";

// import type { Route } from "./+types/sitemap[.]xml";

export async function loader({ request }: { request: Request }) {
  const supabase = createSupabaseServerClient(request);
  const baseUrl = new URL(request.url).origin;

  try {
    // 공개된 콘텐츠 가져오기
    const { data: contents } = await supabase
      .from('contents')
      .select('id, updated_at, category')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    // 작가 목록 가져오기
    const { data: authors } = await supabase
      .from('authors')
      .select('id, name, updated_at');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 홈페이지 -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- 검색 페이지 -->
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- 카테고리 페이지들 -->
  ${Object.keys(CATEGORIES).map(category => `
  <url>
    <loc>${baseUrl}/category/${category}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}

  <!-- 콘텐츠 페이지들 -->
  ${contents?.map(content => `
  <url>
    <loc>${baseUrl}/content/${content.id}</loc>
    <lastmod>${new Date(content.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('') || ''}

  <!-- 작가 페이지들 -->
  ${authors?.map(author => `
  <url>
    <loc>${baseUrl}/author/${encodeURIComponent(author.name)}</loc>
    <lastmod>${new Date(author.updated_at || new Date()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('') || ''}

</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600" // 1시간 캐시
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response("Internal Server Error", { status: 500 });
  }
}