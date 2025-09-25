import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import Navigation from './Navigation';

interface SearchResult {
  id: string;
  title: string;
  author_name: string;
  category: string;
  categoryInfo: {
    name: string;
    icon: string;
  };
  view_count: number;
  likes_count: number;
  created_at: string;
}

interface HeaderProps {
  user?: any;
  isAdmin?: boolean;
}

export default function Header({ user, isAdmin }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 검색 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 검색 처리
  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    // 이전 타이머 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
          const data = await response.json();
          
          if (isSearchOpen && searchQuery.trim().length >= 2) {
            setSearchResults(data.results || []);
          }
        } catch (error) {
          console.error('검색 오류:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isSearchOpen]);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      // 검색 페이지로 이동
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                춘천답기
              </h1>
            </Link>
            <p className="text-xs text-gray-300 hidden sm:block -mt-1">
              춘천문화원 회원 창작물 아카이브
            </p>
          </div>

          {/* 데스크톱 네비게이션 */}
          <div className="hidden md:block">
            <Navigation />
          </div>

          {/* 우측 버튼들 */}
          <div className="flex items-center space-x-4 relative">
            {/* 검색 버튼 */}
            <button
              onClick={handleSearchClick}
              className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              aria-label="검색"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              검색
            </button>
            
            {/* 인증 상태에 따른 버튼 */}
            {user && isAdmin ? (
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-gray-300">{user.email}</span>
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-300 hover:text-blue-100 transition-colors"
                >
                  관리자
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-gray-500 text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="hidden md:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                관리자
              </Link>
            )}
            
            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="모바일 메뉴 토글"
            >
              <svg 
                className="w-6 h-6 text-gray-300"
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

        {/* 검색 드롭다운 */}
        {isSearchOpen && (
          <div 
            ref={searchDropdownRef}
            className="absolute top-full left-0 right-0 bg-gray-800 border-t border-gray-600 shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              {/* 검색 입력 */}
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제목, 내용, 작가명으로 검색..."
                    className="w-full px-4 py-3 pl-12 pr-4 text-lg bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setIsSearching(false);
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        searchInputRef.current?.focus();
                      }}
                      className="absolute inset-y-0 right-12 flex items-center pr-2 text-gray-400 hover:text-gray-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <span className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition-colors text-sm">
                      검색
                    </span>
                  </button>
                </div>
              </form>

              {/* 검색 상태 및 결과 */}
              <div className="min-h-[100px]">
                {searchQuery.length < 2 ? (
                  searchQuery.length > 0 ? (
                  <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">2자 이상 입력해주세요</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm">검색어를 입력해주세요</p>
                    </div>
                  )
                ) : isSearching ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-300">검색 중...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-4">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          to={`/content/${result.id}`}
                          className="block p-3 hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults([]);
                            setIsSearching(false);
                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-lg flex-shrink-0">{result.categoryInfo?.icon || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-white truncate">
                                <span dangerouslySetInnerHTML={{
                                  __html: result.title.replace(
                                    new RegExp(`(${searchQuery})`, 'gi'),
                                    '<mark class="bg-yellow-200 px-0.5">$1</mark>'
                                  )
                                }} />
                              </h3>
                              <p className="text-xs text-gray-300 mt-1">
                                {result.categoryInfo?.name || result.category} • {result.author_name} • {new Date(result.created_at).toLocaleDateString('ko-KR')}
                              </p>
                              <div className="flex items-center text-xs text-gray-400 mt-1 space-x-3">
                                <span>조회 {result.view_count}</span>
                                <span>추천 {result.likes_count}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="text-center border-t border-gray-600 pt-3">
                      <Link
                        to={`/search?q=${encodeURIComponent(searchQuery)}`}
                        className="text-sm text-blue-300 hover:text-blue-100 font-medium"
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          setSearchResults([]);
                          setIsSearching(false);
                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }
                        }}
                      >
                        모든 검색 결과 보기 →
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">'{searchQuery}'에 대한 검색 결과가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 모바일 네비게이션 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-600">
              <Navigation 
                isMobile={true} 
                onItemClick={() => setIsMobileMenuOpen(false)} 
              />
              
              {/* 모바일 검색 링크 */}
              <Link
                to="/search"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700 border-t border-gray-600 mt-2 pt-3"
              >
                🔍 검색
              </Link>

              {/* 모바일 인증 링크 */}
              {user && isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-blue-300 hover:text-blue-100 hover:bg-gray-700"
                  >
                    🔒 관리자
                  </Link>
                  <div className="px-3 py-2 text-sm text-gray-300">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:text-red-100 hover:bg-gray-700"
                  >
                    🚪 로그아웃
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-300 hover:text-blue-100 hover:bg-gray-700"
                >
                  🔑 관리자
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}