import React, { useState } from 'react';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  React.useEffect(() => {
    const handleResize = () => {
      let val = 3;
      if (window.innerWidth <= 480) {
        val = 1;
      } else if (window.innerWidth <= 850) {
        val = 2;
      }
      setItemsPerPage(val);
      setCurrentIndex((prev) => Math.min(STYLES.length - val, prev));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(STYLES.length - itemsPerPage, prev + 1));
  };

  const handleGenerate = () => {
    onSelectStyle(selectedStyle, customPrompt, gender);
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

        {/* Style Carousel */}
        <div className="style-carousel-container">
          <button 
            type="button" 
            className="carousel-nav-btn prev" 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous styles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="style-carousel-track">
            {STYLES.slice(currentIndex, currentIndex + itemsPerPage).map((style) => (
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
            disabled={currentIndex >= STYLES.length - itemsPerPage}
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
