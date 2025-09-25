import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import Navigation from './Navigation';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                춘천답기
              </h1>
            </Link>
            <p className="text-xs text-gray-600 hidden sm:block -mt-1">
              춘천문화원 회원 창작물 아카이브
            </p>
          </div>

          {/* 데스크톱 네비게이션 */}
          <div className="hidden md:block">
            <Navigation />
          </div>

          {/* 우측 버튼들 */}
          <div className="flex items-center space-x-4">
            {/* 검색 링크 */}
            <Link
              to="/search"
              className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              검색
            </Link>
            
            {/* 관리자 링크 - 임시로 항상 표시 */}
            <Link
              to="/admin/dashboard"
              className="hidden md:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              관리자
            </Link>
            
            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="모바일 메뉴 토글"
            >
              <svg 
                className="w-6 h-6 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              <Navigation 
                isMobile={true} 
                onItemClick={() => setIsMobileMenuOpen(false)} 
              />
              
              {/* 모바일 관리자 링크 */}
              <Link
                to="/admin/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 border-t border-gray-200 mt-2 pt-3"
              >
                🔒 관리자
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}