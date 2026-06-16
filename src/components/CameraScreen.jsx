import React, { useRef, useState, useEffect } from 'react';

export default function CameraScreen({ onCapture, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [error, setError] = useState(null);

  // Initialize and manage camera stream
  useEffect(() => {
    if (capturedImage) return; // Pause camera if we already have a photo

    let activeStream = null;

    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);
        setError(null); // Clear errors on success
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('카메라를 활성화할 수 없습니다. 대신 사진 파일을 업로드해 주세요.');
      }
    }

    startCamera();

    // Clean up tracks when camera stops or facingMode toggles
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  // Capture photo from video stream
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (facingMode === 'user') {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Convert uploaded image file to base64 URL
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result); // base64 string
        
        // Stop current streams immediately if running
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null); // Triggers camera restart
  };

  const toggleFacingMode = () => {
    setFacingMode((prevMode) => (prevMode === 'user' ? 'environment' : 'user'));
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="glass-card camera-layout">
      {/* Hidden elements */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleFileUpload} 
      />

      {/* Left side: Viewfinder or Upload Card */}
      <div className="camera-preview-container">
        {capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured preview" 
            className="camera-captured-preview" 
          />
        ) : error ? (
          /* Upload Fallback Card when camera is absent/blocked */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px', background: 'rgba(15,23,42,0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>📁</span>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>카메라를 사용할 수 없습니다</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                기기에 카메라가 없거나 권한이 비활성화되어 있습니다.<br />
                대신 아래 버튼을 눌러 사진 파일을 선택해 주세요.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} style={{ flex: 'none', padding: '12px 28px', fontSize: '0.9rem' }}>
              사진 파일 선택
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="camera-video" 
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <div className="camera-overlay">
              <div className="face-guide-oval">
                <span className="face-guide-text">가이드 안에 인물을 배치해주세요</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right side: Control buttons */}
      <div className="camera-controls-panel">
        <div>
          <h2 className="camera-instruction">
            {capturedImage ? '사진 확인' : '인물 촬영 및 업로드'}
          </h2>
          <p className="camera-sub-instruction">
            {capturedImage 
              ? '업로드된 사진이 마음에 들면 [사용하기]를 누르세요. 다른 파일이나 촬영본을 사용하려면 [다시 선택]을 누르세요.' 
              : error 
                ? 'PC 환경이나 카메라 미지원 브라우저인 경우, 가지고 계신 이미지 파일을 업로드하여 캐리커처 생성을 테스트하실 수 있습니다.'
                : `현재 ${facingMode === 'user' ? '전면(본인)' : '후면(인물)'} 카메라가 켜져 있습니다. 바로 촬영하거나 사진 파일을 직접 올릴 수 있습니다.`}
          </p>
        </div>

        <div className="camera-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {capturedImage ? (
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={handleRetake}>
                <span>다시 선택</span>
              </button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                <span>사용하기</span>
              </button>
            </div>
          ) : error ? (
            /* Layout for Camera Error state */
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={onBack} style={{ flex: '0.4' }}>
                <span>이전으로</span>
              </button>
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} style={{ flex: '1' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>사진 파일 선택</span>
              </button>
            </div>
          ) : (
            /* Layout for Normal Camera State (Stacked 2x2 grid for tablet ergonomics) */
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={onBack} style={{ flex: 1 }}>
                  <span>이전으로</span>
                </button>
                <button className="btn btn-secondary" onClick={toggleFacingMode} style={{ flex: 1 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>카메라 전환</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>사진 업로드</span>
                </button>
                <button className="btn btn-primary" onClick={handleCapture} style={{ flex: 1.2 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <span>사진 촬영</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
