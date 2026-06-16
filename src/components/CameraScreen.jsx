import React, { useRef, useState, useEffect } from 'react';

export default function CameraScreen({ onCapture, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  // Initialize camera stream
  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'user',
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
        setError('카메라를 활성화할 수 없습니다. 기기의 카메라 권한을 확인해주세요.');
      }
    }

    startCamera();

    // Cleanup tracks on unmount
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture photo from video stream
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas size to match video resolution
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Draw mirrored video frame to canvas
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      // Stop camera stream tracks to save resource
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Reset captured image and restart camera stream
  const handleRetake = async () => {
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Failed to restart camera:', err);
      setError('카메라를 다시 시작하는 중 오류가 발생했습니다.');
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="glass-card camera-layout">
      {/* Hidden canvas for capturing images */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Left side: Preview screen */}
      <div className="camera-preview-container">
        {error ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', color: '#ff2a85' }}>
            <p>{error}</p>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured preview" 
            className="camera-captured-preview" 
            style={{ transform: 'none' }} /* Already mirrored during canvas draw */
          />
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="camera-video" 
            />
            <div className="camera-overlay">
              <div className="face-guide-oval">
                <span className="face-guide-text">타원 안에 얼굴을 맞춰주세요</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right side: Instructions and controls */}
      <div className="camera-controls-panel">
        <div>
          <h2 className="camera-instruction">
            {capturedImage ? '촬영 완료!' : '가이드에 맞춰 촬영하기'}
          </h2>
          <p className="camera-sub-instruction">
            {capturedImage 
              ? '찍힌 사진이 마음에 드시나요? 아래 사용하기 버튼을 누르거나, 다시 찍을 수 있습니다.' 
              : '카메라 렌즈를 정면으로 응시하고 밝은 표정으로 촬영해주세요. 최적의 비율로 캐리커처가 생성됩니다.'}
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
