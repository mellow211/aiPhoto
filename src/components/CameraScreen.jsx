import React, { useRef, useState, useEffect } from 'react';

export default function CameraScreen({ onCapture, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [error, setError] = useState(null);

  // Initialize and manage camera stream declaratively
  useEffect(() => {
    if (capturedImage) return; // Pause camera if we already took a photo

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
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('카메라를 활성화할 수 없습니다. 기기의 카메라 권한을 확인하고 전/후면 카메라가 사용 가능한지 점검해주세요.');
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

      // Match canvas dimensions to video
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Apply mirroring ONLY for front camera (user mode)
      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (facingMode === 'user') {
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset mirroring transform
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      // Stop current streams immediately to free up device resources
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null); // Triggers camera restart via useEffect dependencies
  };

  const toggleFacingMode = () => {
    // Switch between user (front) and environment (back) camera
    setFacingMode((prevMode) => (prevMode === 'user' ? 'environment' : 'user'));
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="glass-card camera-layout">
      {/* Hidden canvas for exporting base64 image data */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Left side: Viewfinder preview */}
      <div className="camera-preview-container">
        {error ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', color: 'var(--accent-pink)' }}>
            <p>{error}</p>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured preview" 
            className="camera-captured-preview" 
          />
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

      {/* Right side: Panel logs and actions */}
      <div className="camera-controls-panel">
        <div>
          <h2 className="camera-instruction">
            {capturedImage ? '촬영 완료!' : '가이드에 맞춰 촬영하기'}
          </h2>
          <p className="camera-sub-instruction">
            {capturedImage 
              ? '사진 확인 후 마음에 들면 [사용하기]를 누르세요. 원치 않으면 [다시 찍기]를 눌러 다시 시작할 수 있습니다.' 
              : `현재 ${facingMode === 'user' ? '전면(본인)' : '후면(인물)'} 카메라가 활성화되어 있습니다. 피사체를 향해 구도를 조정하고 촬영 버튼을 눌러주세요.`}
          </p>
        </div>

        <div className="camera-actions">
          {capturedImage ? (
            <>
              <button className="btn btn-secondary" onClick={handleRetake}>
                <span>다시 찍기</span>
              </button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                <span>사용하기</span>
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onBack}>
                <span>이전으로</span>
              </button>
              
              {/* Camera Switch Toggle Button */}
              <button className="btn btn-secondary" onClick={toggleFacingMode} disabled={!!error} style={{ flex: '0.8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>카메라 전환</span>
              </button>

              <button className="btn btn-primary" onClick={handleCapture} disabled={!!error}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>사진 촬영</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
