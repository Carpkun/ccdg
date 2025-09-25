import { useState, useEffect } from 'react';

/**
 * 값을 디바운싱하는 훅
 * 지정된 지연 시간 후에만 값을 업데이트
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 지연 후 값을 업데이트
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 클린업: 이전 타이머 제거
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 실시간 검색을 위한 디바운스 훅
 * 검색어와 로딩 상태를 함께 관리
 */
export function useSearchDebounce(initialValue: string = '', delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  // initialValue가 변경될 때 검색어를 리셋
  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    // 검색어가 변경되면 로딩 상태 시작
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const updateSearchTerm = (newTerm: string) => {
    setSearchTerm(newTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    updateSearchTerm,
    clearSearch
  };
}
