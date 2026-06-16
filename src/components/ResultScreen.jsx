import React from 'react';

const STYLE_NAMES = {
  watercolor: '수채화 (Watercolor)',
  comic: '웹툰/코믹북 (Pop Comic)',
  hero: '슈퍼히어로 (Action Hero)',
  pixel: '레트로 8비트 (Pixel Art)',
  disney: '3D 디즈니 (Disney 3D)',
  sketch: '연필 스케치 (Pencil Sketch)'
};

export default function ResultScreen({ imageUrl, selectedStyle, customPrompt, onRestart }) {
  
  const handleDownload = () => {
    if (!imageUrl) return;
    
    // Create temporary download link
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `caricature_${selectedStyle}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-card result-layout">
      {/* Print-only Container (Invisible normally, visible during printing) */}
      <div id="print-target">
        <img src={imageUrl} alt="Caricature for Print" />
      </div>

      {/* Left side: Rendered Caricature */}
      <div className="result-image-card">
        <img src={imageUrl} alt="Generated Caricature" className="result-image" />
      </div>

      {/* Right side: Information and Actions */}
      <div className="result-info-panel">
        <div>
          <span style={{ color: 'var(--accent-pink)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Caricature Ready</span>
          <h2 className="result-title">나만의 캐리커처 완성!</h2>
          <p className="result-description">
            당신의 개성이 가득 담긴 특별한 그림이 탄생했습니다.
            기기에 고화질 파일로 저장하거나, 이벤트 부스 프린터로 즉시 출력할 수 있습니다.
          </p>
        </div>

        {/* Metadata Details */}
        <div className="result-details-box">
          <div className="result-detail-row">
            <span className="result-detail-label">선택한 스타일</span>
            <span className="result-detail-val">{STYLE_NAMES[selectedStyle] || selectedStyle}</span>
          </div>
          <div className="result-detail-row">
            <span className="result-detail-label">추가 요구사항</span>
            <span className="result-detail-val" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customPrompt || '없음'}
            </span>
          </div>
          <div className="result-detail-row">
            <span className="result-detail-label">해상도 / 포맷</span>
            <span className="result-detail-val">1024 × 1024 (JPEG)</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="result-actions">
          <div className="result-buttons-row">
            <button className="btn btn-secondary" onClick={handleDownload}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>저장하기</span>
            </button>
            
            <button className="btn btn-print" onClick={handlePrint}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>프린트하기</span>
            </button>
          </div>

          <button className="btn btn-secondary" onClick={onRestart} style={{ background: 'rgba(255,255,255,0.02)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>처음부터 다시 하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
