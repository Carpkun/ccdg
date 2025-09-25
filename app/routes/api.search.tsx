import { createSupabaseServerClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '5');

  if (!query || query.trim().length < 2) {
    return Response.json({ results: [] });
  }

  const supabase = createSupabaseServerClient(request);

  try {
    const { data: contents, error } = await supabase
      .from('contents')
      .select('id, title, author_name, category, view_count, likes_count, created_at')
      .eq('is_published', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,author_name.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Instant search error:', error);
      return Response.json({ results: [], error: '검색 중 오류가 발생했습니다.' });
    }

    const results = (contents || []).map(content => ({
      id: content.id,
      title: content.title,
      author_name: content.author_name,
      category: content.category,
      categoryInfo: CATEGORIES[content.category as keyof typeof CATEGORIES],
      view_count: content.view_count,
      likes_count: content.likes_count,
      created_at: content.created_at
    }));

    return Response.json({ results });
  } catch (error) {
    console.error('Instant search loader error:', error);
    return Response.json({ results: [], error: '검색 중 오류가 발생했습니다.' });
  }
}
