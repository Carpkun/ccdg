-- 서화와 영상 카테고리용 새 컬럼 추가
-- 2025-01-24: Add artwork and performance fields

-- 서화 카테고리용 컬럼 추가
ALTER TABLE contents 
ADD COLUMN artwork_size TEXT,
ADD COLUMN artwork_material TEXT;

-- 영상 카테고리용 컬럼 추가  
ALTER TABLE contents
ADD COLUMN performance_date DATE,
ADD COLUMN performance_venue TEXT;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN contents.artwork_size IS '서화 작품 크기 (예: 50cm × 70cm)';
COMMENT ON COLUMN contents.artwork_material IS '서화 작품 재료 (예: 한지, 묵, 붓)';
COMMENT ON COLUMN contents.performance_date IS '공연 일자';
COMMENT ON COLUMN contents.performance_venue IS '공연 장소';