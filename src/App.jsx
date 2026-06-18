import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import CameraScreen from './components/CameraScreen.jsx';
import StyleScreen from './components/StyleScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';

export default function App() {
  const [screen, setScreen] = useState('WELCOME');
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('watercolor');
  const [customPrompt, setCustomPrompt] = useState('');
  const [gender, setGender] = useState('male');
  const [selectedModel, setSelectedModel] = useState('replicate_flux');
  const [generatedCaricature, setGeneratedCaricature] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('starting');

  // Screen transition handlers
  const handleStart = () => {
    setError(null);
    setScreen('CAMERA');
  };

  const handleCapture = (imageData) => {
    setCapturedImage(imageData);
    setScreen('STYLE');
  };

  const handleSelectStyle = async (styleKey, userPrompt, userGender, selectedModelKey) => {
    setSelectedStyle(styleKey);
    setCustomPrompt(userPrompt);
    setGender(userGender);
    setSelectedModel(selectedModelKey);
    setScreen('LOADING');
    setLoadingStatus('starting');
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: capturedImage,
          style: styleKey,
          prompt: userPrompt,
          gender: userGender,
          model: selectedModelKey
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI Caricature generation failed.');
      }

      const data = await response.json();
      
      // If we directly received the image (Mock or direct Stability API)
      if (data.success && data.image) {
        setGeneratedCaricature(data.image);
        setScreen('RESULT');
        return;
      }

      // If we received a prediction ID, initiate polling
      if (data.success && data.predictionId) {
        pollPredictionStatus(data.predictionId);
      } else {
        throw new Error('API returned success: false or invalid response format');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || '인공지능 캐리커처를 생성하는 중에 문제가 발생했습니다.');
      setScreen('ERROR');
    }
  };

  const pollPredictionStatus = (predictionId) => {
    const pollInterval = 2000; // Poll every 2 seconds
    let attempts = 0;
    const maxAttempts = 90; // Timeout after 3 minutes (90 attempts * 2s)

    const checkStatus = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setError('생성 대기 시간이 초과되었습니다. 다시 시도해 주세요.');
        setScreen('ERROR');
        return;
      }

      try {
        const res = await fetch(`/api/status?id=${predictionId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '상태 조회 API 호출 실패');
        }

        const data = await res.json();

        if (data.success) {
          if (data.status === 'succeeded' && data.image) {
            setGeneratedCaricature(data.image);
            setScreen('RESULT');
          } else if (data.status === 'failed' || data.status === 'canceled') {
            throw new Error(data.error || 'AI 생성 작업이 실패하거나 취소되었습니다.');
          } else {
            // Update loading status: 'starting' or 'processing'
            setLoadingStatus(data.status);
            // Keep polling
            setTimeout(checkStatus, pollInterval);
          }
        } else {
          throw new Error(data.error || '작업 상태 조회 실패');
        }
      } catch (err) {
        console.error('[POLLING ERROR]', err);
        setError(err.message || '작업 진행 상태를 확인하는 과정에서 문제가 발생했습니다.');
        setScreen('ERROR');
      }
    };

    // Trigger first poll after the interval
    setTimeout(checkStatus, pollInterval);
  };

  const handleRestart = () => {
    setCapturedImage(null);
    setSelectedStyle('watercolor');
    setCustomPrompt('');
    setGender('male');
    setSelectedModel('replicate_flux');
    setGeneratedCaricature(null);
    setError(null);
    setScreen('WELCOME');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'WELCOME':
        return <WelcomeScreen onStart={handleStart} />;
      case 'CAMERA':
        return (
          <CameraScreen 
            onCapture={handleCapture} 
            onBack={() => setScreen('WELCOME')} 
          />
        );
      case 'STYLE':
        return (
          <StyleScreen 
            capturedImage={capturedImage}
            onSelectStyle={handleSelectStyle}
            onBack={() => setScreen('CAMERA')}
            initialStyle={selectedStyle}
            initialPrompt={customPrompt}
            initialGender={gender}
            initialModel={selectedModel}
          />
        );
      case 'LOADING':
        return <LoadingScreen status={loadingStatus} />;
      case 'RESULT':
        return (
          <ResultScreen 
            imageUrl={generatedCaricature}
            selectedStyle={selectedStyle}
            customPrompt={customPrompt}
            gender={gender}
            onRestart={handleRestart}
          />
        );
      case 'ERROR':
        return (
          <ErrorScreen
            error={error}
            selectedModel={selectedModel}
            selectedStyle={selectedStyle}
            gender={gender}
            onRetry={() => handleSelectStyle(selectedStyle, customPrompt, gender, selectedModel)}
            onChangeOptions={() => {
              setError(null);
              setScreen('STYLE');
            }}
            onRestart={handleRestart}
          />
        );
      default:
        return <WelcomeScreen onStart={handleStart} />;
    }
  };

  return (
    <>
      <div className="app-container">
        {/* Kiosk App Header */}
        <header className="app-header">
          <div className="logo-section">
            <div className="logo-icon">🎨</div>
            <span className="logo-text">AI Caricature Booth</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="header-tag">EVENT ZONE</span>
          </div>
        </header>

        {/* Screen Mount Area */}
        <main className="app-content">
          {renderScreen()}
        </main>
      </div>

      {generatedCaricature && (
        <div id="print-target">
          <img src={generatedCaricature} alt="Caricature for Print" />
        </div>
      )}
    </>
  );
}
