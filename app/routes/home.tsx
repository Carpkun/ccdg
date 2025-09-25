import { useLoaderData, Link } from "react-router";
import { createSupabaseServerClient } from "../lib/supabase";
import type { Content } from "../lib/types";
import { CATEGORIES } from "../lib/types";
import ContentCard from "../components/ContentCard";
import ContentSlider from "../components/ContentSlider";
import ModernParticles from "../components/ModernParticles";

import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "춘천답기 웹진 | 춘천문화원 회원 창작물 아카이브" },
    { name: "description", content: "춘천문화원 회원들의 수필, 한시, 사진, 서화, 영상 등 다양한 창작물을 디지털로 보존하고 공유하는 웹진입니다." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const supabase = createSupabaseServerClient(request);
  
  try {
    // 각 카테고리별 최신 콘텐츠 8개씩 가져오기 (슬라이더용)
    const categoryPromises = Object.keys(CATEGORIES).map(async (category) => {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) {
        console.error(`Error loading ${category} contents:`, error);
        return { category, contents: [] };
      }
      
      return { category, contents: data || [] };
    });
    
    const results = await Promise.all(categoryPromises);
    const contentsByCategory = results.reduce((acc, { category, contents }) => {
      acc[category] = contents;
      return acc;
    }, {} as Record<string, Content[]>);
    
    return { contentsByCategory };
  } catch (error) {
    console.error('Error in home loader:', error);
    return { contentsByCategory: {} };
  }
}

export default function Home() {
  const { contentsByCategory } = useLoaderData<typeof loader>();
  
  return (
    <div>
      {/* 히어로 섹션 */}
      <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-24 lg:py-30 overflow-hidden">
        {/* 현대적 파티클 배경 */}
        <ModernParticles className="z-0" />
        
        {/* 콘텐츠 */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 relative">
            춘천답기 웹진
            <span className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent opacity-80"></span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            춘천문화원 회원들의 소중한 창작물을 디지털 아카이브로 보존하고 공유합니다
          </p>
          
          {/* 추가 서브 타이틀 */}
          <div className="mt-6 text-gray-400 text-lg">
            <span className="inline-block w-12 h-px bg-purple-400 mx-2 align-middle"></span>
            수필 · 한시 · 사진 · 서화 · 영상
            <span className="inline-block w-12 h-px bg-purple-400 mx-2 align-middle"></span>
          </div>
        </div>
        
        {/* 바닥 그라데이션 효과 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* 추가 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20"></div>
      </section>
        
        {/* 카테고리별 콘텐츠 미리보기 */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {Object.entries(CATEGORIES).map(([slug, category]) => {
              const contents = contentsByCategory[slug] || [];
              
              return (
                <div key={slug} className="mb-16 last:mb-0">
                  {/* 카테고리 헤더 */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                      <span className="text-4xl mr-4" style={{ color: category.color }}>{category.icon}</span>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{category.name}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
                      </div>
                    </div>
                    <Link
                      to={`/category/${slug}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                      style={{ backgroundColor: category.color }}
                    >
                      더보기 →
                    </Link>
                  </div>
                  
                  {contents.length > 0 ? (
                    <ContentSlider>
                      {contents.map((content) => (
                        <div key={content.id} className="min-w-[280px] max-w-[280px]">
                          <ContentCard 
                            content={content} 
                            showCategory={false}
                            enableHoverBorder={false}
                            enableHoverBackground={true}
                          />
                        </div>
                      ))}
                    </ContentSlider>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <span className="text-6xl mb-4 block opacity-50" style={{ color: category.color }}>{category.icon}</span>
                        <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">아직 {category.name} 작품이 없습니다.</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">첫 번째 {category.name} 작품을 기다리고 있어요!</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
    </div>
  );
}
