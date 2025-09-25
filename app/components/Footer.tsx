import { Link } from 'react-router';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 브랜드 섹션 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4">춘천답기 웹진</h3>
            <p className="text-gray-300 mb-4">
              춘천문화원 회원들의 소중한 창작물을 디지털 아카이브로 보존하고 공유하는 플랫폼입니다.
              수필, 한시, 사진, 서화, 영상 등 다양한 장르의 작품들을 만나보세요.
            </p>
            <p className="text-gray-400 text-sm">
              © {currentYear} 춘천문화원. All rights reserved.
            </p>
          </div>

          {/* 카테고리 링크 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">카테고리</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/category/essay" className="text-gray-300 hover:text-white transition-colors">
                  📝 수필
                </Link>
              </li>
              <li>
                <Link to="/category/poetry" className="text-gray-300 hover:text-white transition-colors">
                  📜 한시
                </Link>
              </li>
              <li>
                <Link to="/category/photo" className="text-gray-300 hover:text-white transition-colors">
                  📸 사진
                </Link>
              </li>
              <li>
                <Link to="/category/calligraphy" className="text-gray-300 hover:text-white transition-colors">
                  🖼️ 서화
                </Link>
              </li>
              <li>
                <Link to="/category/video" className="text-gray-300 hover:text-white transition-colors">
                  🎬 영상
                </Link>
              </li>
            </ul>
          </div>

          {/* 기타 링크 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">정보</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="http://cccf.or.kr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  춘천문화원 홈페이지
                </a>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                  소개
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
                  문의
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 구분선 */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            춘천문화원 회원들의 창작물은 저작권법의 보호를 받습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}