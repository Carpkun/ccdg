import { useState, useEffect } from 'react';
import type { Content } from '../lib/types';

interface PhotoContentProps {
  content: Content;
}

// 이미지 URL 유효성 검사 함수
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // 더미 URL 체크
  if (url.includes('example.com') || url.includes('placeholder') || url.includes('dummy')) {
    return false;
  }
  
  // 기본적인 이미지 확장자 체크
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  // URL 형태 체크
  const isValidUrl = /^https?:\/\/.+/.test(url);
  
  return isValidUrl && (hasImageExtension || url.includes('image') || url.includes('photo'));
}

// EXIF 데이터 처리 함수
async function extractExifData(imageUrl: string) {
  try {
    // 동적 import로 exifr 라이브러리 로드
    const exifr = await import('exifr');
    
    // 이미지에서 EXIF 데이터 추출
    const rawExif = await exifr.parse(imageUrl, {
      pick: [
        'FNumber', 'ExposureTime', 'ISO', 'FocalLength',
        'Make', 'Model', 'LensModel', 'LensInfo',
        'DateTimeOriginal', 'DateTime',
        'GPSLatitude', 'GPSLongitude',
        'Flash', 'WhiteBalance', 'MeteringMode',
        'ExposureMode', 'ColorSpace', 'Orientation', 'Software'
      ]
    });
    
    if (!rawExif) {
      throw new Error('EXIF 데이터가 없습니다');
    }
    
    // EXIF 데이터를 사용자 친화적 형태로 변환
    const processedData: any = {};
    
    // 조리개값
    if (rawExif.FNumber) {
      processedData.aperture = `f/${rawExif.FNumber}`;
    }
    
    // 셔터속도
    if (rawExif.ExposureTime) {
      if (rawExif.ExposureTime >= 1) {
        processedData.shutterSpeed = `${rawExif.ExposureTime}s`;
      } else {
        const denominator = Math.round(1 / rawExif.ExposureTime);
        processedData.shutterSpeed = `1/${denominator}s`;
      }
    }
    
    // ISO
    if (rawExif.ISO) {
      processedData.iso = rawExif.ISO;
    }
    
    // 초점거리
    if (rawExif.FocalLength) {
      processedData.focalLength = `${rawExif.FocalLength}mm`;
    }
    
    // 카메라 정보 (브랜드명 중복 제거)
    if (rawExif.Make && rawExif.Model) {
      const make = rawExif.Make.trim();
      const model = rawExif.Model.trim();
      // 모델명이 브랜드명으로 시작하지 않을 때만 브랜드명 추가
      const isModelStartsWithMake = model.toLowerCase().startsWith(make.toLowerCase());
      processedData.camera = isModelStartsWithMake ? model : `${make} ${model}`;
    } else if (rawExif.Model) {
      processedData.camera = rawExif.Model;
    }
    
    // 렌즈 정보
    if (rawExif.LensModel) {
      processedData.lens = rawExif.LensModel;
    }
    
    // 촬영일시
    if (rawExif.DateTimeOriginal) {
      processedData.dateTime = rawExif.DateTimeOriginal;
    } else if (rawExif.DateTime) {
      processedData.dateTime = rawExif.DateTime;
    }
    
    // 노출 모드
    if (rawExif.ExposureMode !== undefined) {
      const exposureModes = {
        0: '자동 노출',
        1: '수동 노출',
        2: '자동 브래킷'
      };
      processedData.exposureMode = exposureModes[rawExif.ExposureMode as keyof typeof exposureModes] || `노출모드: ${rawExif.ExposureMode}`;
    }
    
    // 측광 모드
    if (rawExif.MeteringMode !== undefined) {
      const meteringModes = {
        0: '알 수 없음',
        1: '평균',
        2: '중앙 중점',
        3: '스팩',
        4: '멀티스팩',
        5: '패턴',
        6: '부분'
      };
      processedData.meteringMode = meteringModes[rawExif.MeteringMode as keyof typeof meteringModes] || `측광모드: ${rawExif.MeteringMode}`;
    }
    
    // 플래시
    if (rawExif.Flash !== undefined) {
      processedData.flash = rawExif.Flash === 0 ? 'No' : 'Yes';
    }
    
    return processedData;
    
  } catch (error) {
    console.error('EXIF 추출 오류:', error);
    return null;
  }
}

export default function PhotoContent({ content }: PhotoContentProps) {
  const [exifData, setExifData] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [exifLoading, setExifLoading] = useState(true);
  
  const imageUrl = content.image_url || content.thumbnail_url;
  
  
  // EXIF 데이터 처리 - 실제 이미지에서 추출
  useEffect(() => {
    async function loadExifData() {
      setExifLoading(true);
      
      if (!imageUrl) {
        setExifData(null);
        setExifLoading(false);
        return;
      }
      
      // 데이터베이스에 저장된 EXIF 데이터가 있으면 우선 사용
      if (content.image_exif && content.image_exif !== null) {
        try {
          const parsedExif = typeof content.image_exif === 'string' 
            ? JSON.parse(content.image_exif) 
            : content.image_exif;
          setExifData(parsedExif);
          setExifLoading(false);
          return;
        } catch (error) {
          console.error('DB EXIF 파싱 오류:', error);
        }
      }
      
      // 데이터베이스에 EXIF 데이터가 없으면 이미지에서 직접 추출
      const extractedExif = await extractExifData(imageUrl);
      if (extractedExif && Object.keys(extractedExif).length > 0) {
        setExifData(extractedExif);
      } else {
        setExifData(null);
      }
      
      setExifLoading(false);
    }
    
    loadExifData();
  }, [content.image_exif, imageUrl]);
  
  const handleImageClick = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 왼쪽: 이미지 영역 (2/3) */}
      <div className="lg:col-span-2 order-1 lg:order-1">
        {imageUrl && isValidImageUrl(imageUrl) && !imageError ? (
          <div className="w-full">
            <img
              src={imageUrl}
              alt={`${content.title} - ${content.author_name} 작품`}
              className="w-full h-auto max-h-[600px] object-contain rounded-lg shadow-lg cursor-pointer transition-opacity hover:opacity-90 bg-white"
              onError={() => {
                setImageError(true);
              }}
              onLoad={() => {
                setImageLoaded(true);
              }}
              onClick={handleImageClick}
            />
            
            {/* 클릭 힌트 */}
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500">이미지를 클릭하면 확대됩니다</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">사진 작품</h3>
              <p className="text-sm text-gray-500">
                {imageError ? '이미지를 불러올 수 없습니다' : '이미지 준비 중...'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* 오른쪽: 촬영정보 & 작품소개 (1/3) */}
      <div className="space-y-4 lg:space-y-6 order-2 lg:order-2">
        {/* 상단: 촬영정보 */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h4 className="font-semibold text-blue-900 text-sm">촬영 정보</h4>
          </div>
          
        {exifLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-blue-700">EXIF 정보 불러오는 중...</span>
          </div>
        ) : exifData && Object.keys(exifData).length > 0 ? (
          <div className="space-y-3 text-sm">
            {/* 촬영 정보 그리드 레이아웃 */}
            <div className="space-y-3">
              {/* 첫 번째 줄: 카메라 */}
              <div className="flex justify-between items-start">
                <span className="text-blue-700 font-medium whitespace-nowrap">카메라:</span>
                <span 
                  className="text-blue-900 text-right ml-3 line-clamp-2"
                  title={exifData.camera || '-'}
                >
                  {exifData.camera || '-'}
                </span>
              </div>
              
              {/* 두 번째 줄: 렌즈 */}
              <div className="flex justify-between items-start">
                <span className="text-blue-700 font-medium whitespace-nowrap">렌즈:</span>
                <span 
                  className="text-blue-900 text-right ml-3 line-clamp-2"
                  title={exifData.lens || '-'}
                >
                  {exifData.lens || '-'}
                </span>
              </div>
              
              {/* 세 번째 줄: 조리개, 셔터속도 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">조리개:</span>
                  <span className="text-blue-900">{exifData.aperture || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">셔터속도:</span>
                  <span className="text-blue-900">{exifData.shutterSpeed || '-'}</span>
                </div>
              </div>
              
              {/* 네 번째 줄: ISO, 초점거리 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">ISO:</span>
                  <span className="text-blue-900">{exifData.iso || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">초점거리:</span>
                  <span className="text-blue-900">{exifData.focalLength || '-'}</span>
                </div>
              </div>
              
              {/* 다섯 번째 줄: 노출모드 */}
              <div className="flex justify-between items-start">
                <span className="text-blue-700 font-medium whitespace-nowrap">노출모드:</span>
                <span className="text-blue-900 text-right ml-3">
                  {exifData.exposureMode ? exifData.exposureMode.replace('노출모드:', '').trim() : '-'}
                </span>
              </div>
              
              {/* 여섯 번째 줄: 촬영일시 */}
              <div className="flex justify-between items-start">
                <span className="text-blue-700 font-medium whitespace-nowrap">촬영일시:</span>
                <span 
                  className="text-blue-900 text-right ml-3 line-clamp-2"
                  title={exifData.dateTime ? 
                    new Date(exifData.dateTime).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).replace(/\./g, '. ').replace(/\s/g, ' ') : '-'
                  }
                >
                  {exifData.dateTime ? 
                    new Date(exifData.dateTime).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).replace(/\./g, '. ').replace(/\s/g, ' ') : '-'
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">
              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">촬영 정보가 없습니다</p>
          </div>
        )}
        </div>
        
        {/* 하단: 작품소개 */}
        {content.content && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              작품 소개
            </h3>
            <div className="text-sm text-gray-700 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: content.content }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}