import { Link, useLocation } from 'react-router';

interface NavigationProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

const navigationItems = [
  { name: '전체', href: '/', category: 'all', icon: '📚' },
  { name: '수필', href: '/category/essay', category: 'essay', icon: '📝' },
  { name: '한시', href: '/category/poetry', category: 'poetry', icon: '📜' },
  { name: '사진', href: '/category/photo', category: 'photo', icon: '📸' },
  { name: '서화', href: '/category/calligraphy', category: 'calligraphy', icon: '🖼️' },
  { name: '영상', href: '/category/video', category: 'video', icon: '🎬' },
];

export default function Navigation({ isMobile = false, onItemClick }: NavigationProps) {
  const location = useLocation();
  
  // 현재 활성 카테고리 판단
  const getCurrentCategory = () => {
    if (location.pathname === '/' || location.pathname === '/home') return 'all';
    if (location.pathname.startsWith('/category/')) {
      return location.pathname.split('/')[2]; // /category/essay -> essay
    }
    return 'all';
  };
  
  const currentCategory = getCurrentCategory();
  
  return (
    <nav className={isMobile ? 'flex flex-col space-y-1' : 'flex space-x-8'}>
      {navigationItems.map((item) => {
        const isActive = currentCategory === item.category;
        
        return (
          <Link
            key={item.category}
            to={item.href}
            onClick={() => {
              onItemClick?.();
            }}
            className={`
              flex items-center space-x-2 transition-colors duration-200
              ${isMobile 
                ? `block px-3 py-2 rounded-md text-base font-medium ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`
                : `text-sm font-medium pb-4 border-b-2 ${isActive
                    ? 'text-blue-300 border-blue-300'
                    : 'text-gray-300 hover:text-white border-transparent hover:border-gray-400'
                  }`
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}