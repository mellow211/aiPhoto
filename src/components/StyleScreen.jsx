import React, { useState } from 'react';

const STYLES = [
  { key: 'watercolor', icon: '🎨', nameKo: '수채화 스타일', nameEn: 'Watercolor Canvas' },
  { key: 'comic', icon: '💬', nameKo: '웹툰/코믹북 스타일', nameEn: 'Pop Comic Book' },
  { key: 'hero', icon: '⚡', nameKo: '슈퍼히어로 스타일', nameEn: 'Action Hero Portrait' },
  { key: 'pixel', icon: '👾', nameKo: '레트로 8비트 스타일', nameEn: 'Retro Pixel Art' },
  { key: 'disney', icon: '🧸', nameKo: '3D 디즈니 스타일', nameEn: 'Disney-Pixar 3D' },
  { key: 'sketch', icon: '✏️', nameKo: '연필 스케치 스타일', nameEn: 'Detailed Pencil Sketch' }
];

export default function StyleScreen({ capturedImage, onSelectStyle, onBack }) {
  const [selectedStyle, setSelectedStyle] = useState('watercolor');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleGenerate = () => {
    onSelectStyle(selectedStyle, customPrompt);
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>생성하고 싶은 아트를 선택하고, 필요시 추가 상세 요구사항을 입력하세요.</p>
        </div>

        {/* Style Grid */}
        <div className="style-grid-container">
          <div className="style-grid">
            {STYLES.map((style) => (
              <button
                key={style.key}
                className={`style-item ${selectedStyle === style.key ? 'selected' : ''}`}
                onClick={() => setSelectedStyle(style.key)}
              >
                <span className="style-icon">{style.icon}</span>
                <div className="style-info">
                  <span className="style-name-ko">{style.nameKo}</span>
                  <span className="style-name-en">{style.nameEn}</span>
                </div>
              </button>
            ))}
          </div>
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
