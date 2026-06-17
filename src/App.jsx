import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import CameraScreen from './components/CameraScreen.jsx';
import StyleScreen from './components/StyleScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';

export default function App() {
  const [screen, setScreen] = useState('WELCOME');
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('watercolor');
  const [customPrompt, setCustomPrompt] = useState('');
  const [gender, setGender] = useState('male');
  const [generatedCaricature, setGeneratedCaricature] = useState(null);
  const [error, setError] = useState(null);

  // Screen transition handlers
  const handleStart = () => {
    setError(null);
    setScreen('CAMERA');
  };

  const handleCapture = (imageData) => {
    setCapturedImage(imageData);
    setScreen('STYLE');
  };

  const handleSelectStyle = async (styleKey, userPrompt, userGender) => {
    setSelectedStyle(styleKey);
    setCustomPrompt(userPrompt);
    setGender(userGender);
    setScreen('LOADING');

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
          gender: userGender
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI Caricature generation failed.');
      }

      const data = await response.json();
      if (data.success) {
        setGeneratedCaricature(data.image);
        setScreen('RESULT');
      } else {
        throw new Error('API returned success: false');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || '인공지능 캐리커처를 생성하는 중에 문제가 발생했습니다.');
      // Keep style options active but return to style select screen to let user try again
      setScreen('STYLE');
    }
  };

  const handleRestart = () => {
    setCapturedImage(null);
    setSelectedStyle('watercolor');
    setCustomPrompt('');
    setGender('male');
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
          />
        );
      case 'LOADING':
        return <LoadingScreen />;
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
            {error && (
              <span style={{ color: '#ff2a85', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,42,133,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                ⚠️ {error}
              </span>
            )}
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
