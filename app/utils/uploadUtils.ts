/**
 * 이미지 파일 유효성 검사 유틸리티
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  imageData?: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
}

/**
 * 이미지 파일 유효성 검사
 * @param file - 검사할 파일
 * @param maxSize - 최대 파일 크기 (바이트)
 * @param maxWidth - 최대 너비
 * @param maxHeight - 최대 높이
 * @returns 검사 결과
 */
export function validateImageFile(
  file: File,
  maxSize: number = 2 * 1024 * 1024, // 2MB
  maxWidth: number = 1024,
  maxHeight: number = 1024
): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    // 파일 타입 검사
    if (!file.type.startsWith('image/')) {
      resolve({
        isValid: false,
        error: '이미지 파일만 업로드할 수 있습니다.'
      });
      return;
    }

    // 파일 크기 검사
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      resolve({
        isValid: false,
        error: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 가능합니다.`
      });
      return;
    }

    // 이미지 차원 검사
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          isValid: false,
          error: `이미지 크기가 너무 큽니다. 최대 ${maxWidth}x${maxHeight}px까지 가능합니다.`
        });
        return;
      }

      resolve({
        isValid: true,
        imageData: {
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type
        }
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        error: '유효하지 않은 이미지 파일입니다.'
      });
    };

    img.src = url;
  });
}

/**
 * 파일을 Base64로 변환
 * @param file - 변환할 파일
 * @returns Base64 문자열
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * URL이 유효한 이미지 URL인지 검사
 * @param url - 검사할 URL
 * @returns 유효성 검사 결과
 */
export function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || !isValidUrl(url)) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * 유효한 URL인지 확인
 * @param string - 검사할 문자열
 * @returns 유효한 URL 여부
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param bytes - 바이트 크기
 * @returns 형식화된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}