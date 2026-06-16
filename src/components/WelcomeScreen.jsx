import React from 'react';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="glass-card welcome-layout">
      <div className="welcome-badge">AI Experience Zone</div>
      <h1 className="welcome-title">AI 캐리커처 생성소</h1>
      <p className="welcome-subtitle">
        단 몇 초 만에 완성되는 당신만의 특별한 캐리커처!
        카메라로 얼굴을 촬영하고 원하는 예술 스타일을 선택하면, 
        인공지능이 개성 넘치는 인물화를 그려드립니다.
      </p>
      
      <button className="start-btn" onClick={onStart}>
        <span>캐리커처 만들기</span>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  );
}
