import React, { useState } from 'react';

// Error classification helper
function classifyError(errorMsg) {
  const msg = (errorMsg || '').toLowerCase();
  
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('504')) {
    return {
      type: 'TIMEOUT',
      icon: '⏱️',
      title: '생성 대기 시간 초과 (Timeout)',
      description: '현재 AI 서버에 동시 요청량이 많아 이미지를 만드는 데 시간이 너무 오래 걸렸습니다.',
      guides: [
        '일시적인 혼잡일 수 있으니 [현재 설정으로 다시 시도]를 눌러보세요.',
        '덜 붐비고 빠른 다른 AI 모델(예: Google Nano Banana 2 또는 Qwen Image Edit)로 변경해 보세요.',
        '사진이 너무 크거나 배경이 복잡할 경우 처리가 늦어질 수 있으니 재촬영해 보세요.'
      ]
    };
  }
  
  if (msg.includes('429') || msg.includes('rate') || msg.includes('limit') || msg.includes('too many requests')) {
    return {
      type: 'RATE_LIMIT',
      icon: '🚨',
      title: '일시적인 요청 한도 초과 (Rate Limit)',
      description: '단시간 내에 너무 많은 사용자가 동시에 요청을 시도하여 AI 서비스 호출이 일시 제한되었습니다.',
      guides: [
        '약 10초~20초 정도 잠시 기다리신 후 [현재 설정으로 다시 시도]해 보세요.',
        '다른 AI 모델을 선택하여 요청을 분산시켜 보세요.',
        '이벤트 현장 부스인 경우, 현장 스태프에게 즉시 문의해 주세요.'
      ]
    };
  }

  if (msg.includes('api key') || msg.includes('token') || msg.includes('환경 변수') || msg.includes('not set') || msg.includes('설정되지 않았습니다')) {
    return {
      type: 'CONFIG_ERROR',
      icon: '🔑',
      title: '서버 설정 오류 (API Key Missing)',
      description: '서버의 환경 설정(.env) 파일에 AI API 서비스 이용을 위한 토큰/키가 등록되지 않았습니다.',
      guides: [
        '서버의 프로젝트 루트 폴더에 있는 .env 파일에 REPLICATE_API_TOKEN 등의 키가 올바르게 입력되었는지 확인해 주세요.',
        '서버 터미널 콘솔 로그를 확인해 보거나, 시스템 관리자 및 개발자에게 문의해 주세요.'
      ]
    };
  }

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('failed to fetch')) {
    return {
      type: 'NETWORK_ERROR',
      icon: '🔌',
      title: '네트워크 연결 불안정',
      description: '서버 또는 로컬 네트워크와의 연결이 끊어졌거나 통신할 수 없습니다.',
      guides: [
        '태블릿이나 PC의 Wi-Fi 또는 모바일 데이터(LTE/5G) 연결 상태를 확인해 주세요.',
        '로컬 서버(node.js)가 정상적으로 켜져 있는지 확인하고 [다시 시도]를 눌러주세요.'
      ]
    };
  }

  // Refusal by AI filter / Safety filters
  if (msg.includes('refus') || msg.includes('safety') || msg.includes('nsfw') || msg.includes('content filter') || msg.includes('guidelines')) {
    return {
      type: 'SAFETY_ERROR',
      icon: '🛡️',
      title: 'AI 보안 필터링 감지',
      description: '업로드된 사진 또는 텍스트 설명이 AI 콘텐츠 안전 가이드라인에 의해 차단되었습니다.',
      guides: [
        '추가 요구사항(텍스트)에 부적절한 외래어나 특수문자가 있다면 지우고 다시 시도해 주세요.',
        '카메라 사진 촬영 시 얼굴이 더 선명하게 나오고 어두운 그림자가 지지 않도록 다시 촬영해 보세요.'
      ]
    };
  }

  // General Error Fallback
  return {
    type: 'GENERAL',
    icon: '⚠️',
    title: '캐리커처 생성 오류',
    description: 'AI 이미지 변환 작업을 진행하는 과정에서 알 수 없는 오류가 발생했습니다.',
    guides: [
      '일시적 통신 지연이나 일시적인 AI 서버 오류일 수 있으니 다시 한 번 시도해 보세요.',
      '다른 AI 이미지 생성 모델이나 스타일을 선택해 보세요.',
      '머리 스타일이나 얼굴이 선명하게 보이도록 다시 사진을 찍어서 시도해 보세요.'
    ]
  };
}

export default function ErrorScreen({ error, selectedModel, selectedStyle, gender, onRetry, onChangeOptions, onRestart }) {
  const [showDetails, setShowDetails] = useState(false);
  const errorInfo = classifyError(error);

  const modelLabels = {
    replicate_flux: 'Replicate: FLUX Caricature',
    replicate_qwen: 'Replicate: Qwen Image Edit',
    openai_dalle: 'Replicate: OpenAI GPT Image 2',
    gemini_imagen: 'Replicate: Google Nano Banana 2'
  };

  const styleLabels = {
    default: '기본 캐리커처',
    watercolor: '수채화 스타일',
    comic: '웹툰/코믹북 스타일',
    hero: '슈퍼히어로 스타일',
    pixel: '레트로 8비트 스타일',
    disney: '3D 디즈니 스타일',
    sketch: '연필 스케치 스타일'
  };

  return (
    <div className="glass-card error-layout">
      {/* Left side: Alert Box */}
      <div className="error-info-card">
        <div className="error-badge-icon">{errorInfo.icon}</div>
        <h2 className="error-title-text">{errorInfo.title}</h2>
        <p className="error-desc-text">{errorInfo.description}</p>
        
        {/* Info Grid */}
        <div className="error-meta-grid">
          <div className="error-meta-row">
            <span className="error-meta-lbl">선택된 모델</span>
            <span className="error-meta-val">{modelLabels[selectedModel] || selectedModel}</span>
          </div>
          <div className="error-meta-row">
            <span className="error-meta-lbl">적용 스타일</span>
            <span className="error-meta-val">{styleLabels[selectedStyle] || selectedStyle}</span>
          </div>
        </div>

        {/* Technical details toggle */}
        <div className="error-details-container">
          <button 
            className="error-details-toggle" 
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>{showDetails ? '▼ 상세 오류 메시지 숨기기' : '▶ 상세 오류 메시지 보기'}</span>
          </button>
          {showDetails && (
            <div className="error-details-content">
              {error || '상세 오류 코드가 정의되지 않았습니다.'}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Action list and buttons */}
      <div className="error-actions-panel">
        <div>
          <h3 className="error-guide-header">💡 추천 해결 대처법</h3>
          <ul className="error-guide-list">
            {errorInfo.guides.map((guide, idx) => (
              <li key={idx} className="error-guide-item">
                <span className="error-guide-num">{idx + 1}</span>
                <span className="error-guide-txt">{guide}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Controls */}
        <div className="error-buttons-container">
          <button className="btn btn-primary btn-error-retry" onClick={onRetry}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            <span>현재 설정으로 다시 시도</span>
          </button>

          <div className="error-buttons-secondary">
            <button className="btn btn-secondary" onClick={onChangeOptions}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>모델/옵션 변경</span>
            </button>
            <button className="btn btn-secondary" onClick={onRestart}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>처음부터 (재촬영)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
