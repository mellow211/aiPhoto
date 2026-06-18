import React, { useState, useRef, useEffect } from 'react';

const STYLES = [
  { key: 'default', icon: '🎭', nameKo: '기본 캐리커처', nameEn: 'Classic Caricature' },
  { key: 'watercolor', icon: '🎨', nameKo: '수채화 스타일', nameEn: 'Watercolor Canvas' },
  { key: 'comic', icon: '💬', nameKo: '웹툰/코믹북 스타일', nameEn: 'Pop Comic Book' },
  { key: 'hero', icon: '⚡', nameKo: '슈퍼히어로 스타일', nameEn: 'Action Hero Portrait' },
  { key: 'pixel', icon: '👾', nameKo: '레트로 8비트 스타일', nameEn: 'Retro Pixel Art' },
  { key: 'disney', icon: '🧸', nameKo: '3D 디즈니 스타일', nameEn: 'Disney-Pixar 3D' },
  { key: 'sketch', icon: '✏️', nameKo: '연필 스케치 스타일', nameEn: 'Detailed Pencil Sketch' }
];

export default function StyleScreen({ capturedImage, onSelectStyle, onBack }) {
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [gender, setGender] = useState('male');
  const [selectedModel, setSelectedModel] = useState('replicate_flux');

  const carouselRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // 스크롤 감지하여 버튼 활성화 여부 갱신
  const handleScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    // canPrev: 스크롤이 시작점(0)보다 10px 이상 우측에 있을 때
    setCanPrev(el.scrollLeft > 10);
    // canNext: 남은 스크롤 거리가 클라이언트 영역보다 10px 이상 있을 때
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  // 마운트 시 및 리사이즈 시 초기 체크
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  // 화살표 버튼 클릭 스크롤 액션
  const handlePrev = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.style-item-card')?.clientWidth || 150;
    const gap = 12;
    el.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
  };

  const handleNext = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.style-item-card')?.clientWidth || 150;
    const gap = 12;
    el.scrollBy({ left: cardWidth + gap, behavior: 'smooth' });
  };

  // 데스크톱 환경용 마우스 드래그 가로 스크롤 구현
  const handleMouseDown = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    setIsMouseDown(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const el = carouselRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5; // 드래그 속도 조절
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleGenerate = () => {
    onSelectStyle(selectedStyle, customPrompt, gender, selectedModel);
  };

  return (
    <div className="glass-card style-layout">
      {/* Left side: Photo preview */}
      <div className="style-photo-preview">
        <img src={capturedImage} alt="Captured user profile" />
      </div>

      {/* Right side: Options and controls */}
      <div className="style-options-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>캐리커처 스타일 선택</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>성별과 생성하고 싶은 아트를 선택하고, 추가 요구사항을 입력하세요.</p>
        </div>

        {/* AI Model & Gender Selection Row */}
        <div className="style-flex-row">
          {/* AI Model Selection */}
          <div className="model-selection-container">
            <label className="prompt-label">AI 생성 모델 선택</label>
            <select 
              className="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="replicate_flux">🎨 Replicate: FLUX Caricature (추천)</option>
              <option value="replicate_qwen">👾 Replicate: Qwen Image Edit (도트 강화)</option>
              <option value="openai_dalle">🤖 Replicate: OpenAI GPT-4o + FLUX</option>
              <option value="gemini_imagen">✨ Replicate: Gemini 2.5 Flash + FLUX</option>
            </select>
          </div>

          {/* Gender Selection */}
          <div className="gender-selection-container">
            <label className="prompt-label">성별 선택 (필수)</label>
            <div className="gender-buttons">
              <button 
                type="button"
                className={`gender-button ${gender === 'male' ? 'selected' : ''}`}
                onClick={() => setGender('male')}
              >
                <span>🙋‍♂️</span>
                <span>남성 (Male)</span>
              </button>
              <button 
                type="button"
                className={`gender-button ${gender === 'female' ? 'selected' : ''}`}
                onClick={() => setGender('female')}
              >
                <span>🙋‍♀️</span>
                <span>여성 (Female)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Style Carousel */}
        <div className="style-carousel-container">
          <button 
            type="button" 
            className="carousel-nav-btn prev" 
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous styles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div 
            ref={carouselRef}
            className="style-carousel-track"
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {STYLES.map((style) => (
              <button
                key={style.key}
                type="button"
                className={`style-item-card ${selectedStyle === style.key ? 'selected' : ''}`}
                onClick={() => setSelectedStyle(style.key)}
              >
                <span className="style-card-icon">{style.icon}</span>
                <span className="style-card-name-ko">{style.nameKo}</span>
                <span className="style-card-name-en">{style.nameEn}</span>
              </button>
            ))}
          </div>
          
          <button 
            type="button" 
            className="carousel-nav-btn next" 
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next styles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Custom text input */}
        <div className="prompt-input-container">
          <label className="prompt-label">
            <span>추가 요구사항 입력 (선택사항)</span>
            <span>{customPrompt.length}/100</span>
          </label>
          <textarea
            className="prompt-textarea"
            placeholder="예: 안경을 그려줘, 머리에 왕관을 씌워줘, 환하게 미소 짓게 해줘"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value.slice(0, 100))}
          />
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ flex: '0.4' }}>
            <span>이전으로</span>
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} style={{ flex: '1' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 2 22 11.5 17 22 22 12 2"></polygon>
            </svg>
            <span>캐리커처 그리기 시작</span>
          </button>
        </div>
      </div>
    </div>
  );
}
