import React, { useState, useEffect } from 'react';

const LOADING_STATUSES = [
  '인물 사진에서 이목구비 위치 정보 분석 중...',
  '선택하신 화풍에 맞춰 가이드 연필 선 스케치 중...',
  '캐리커처 구조에 적절한 만화적 쉐이딩 추가 중...',
  '전반적인 색조 조화 및 디테일 브러시 레이어 렌더링 중...',
  '종이 질감 및 외곽선 선 정리 등 최종 캔버스 마감 중...'
];

export default function LoadingScreen() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prevIndex) => (prevIndex + 1) % LOADING_STATUSES.length);
    }, 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card loading-layout">
      <div className="loading-art-container">
        <div className="loading-circle"></div>
        <div className="loading-brush">🖌️</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 className="loading-status-title">캐리커처 그리는 중...</h2>
        <p className="loading-status-text">{LOADING_STATUSES[statusIndex]}</p>
      </div>
    </div>
  );
}
