import React, { useState, useRef, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';

interface CompletionCardProps {
  isVisible: boolean;
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  totalElapsedTime: number;
  onClose: () => void;
}

const CompletionCard: React.FC<CompletionCardProps> = ({
  isVisible,
  mappedPixelData,
  gridDimensions,
  totalElapsedTime,
  onClose
}) => {
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);

  // 计算总豆子数（排除透明区域）
  const totalBeads = React.useMemo(() => {
    if (!mappedPixelData) return 0;
    
    let count = 0;
    for (let row = 0; row < gridDimensions.M; row++) {
      for (let col = 0; col < gridDimensions.N; col++) {
        const pixel = mappedPixelData[row][col];
        // 排除透明色和空白区域
        if (pixel.color && 
            pixel.color !== 'transparent' && 
            pixel.color !== 'rgba(0,0,0,0)' &&
            !pixel.color.includes('rgba(0, 0, 0, 0)')) {
          count++;
        }
      }
    }
    return count;
  }, [mappedPixelData, gridDimensions]);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分${secs}秒`;
    }
  };

  // 生成原图缩略图
  const generateThumbnail = useCallback(() => {
    if (!mappedPixelData) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const thumbnailSize = 200;
    canvas.width = thumbnailSize;
    canvas.height = thumbnailSize;

    const cellWidth = thumbnailSize / gridDimensions.N;
    const cellHeight = thumbnailSize / gridDimensions.M;

    // 绘制缩略图
    for (let row = 0; row < gridDimensions.M; row++) {
      for (let col = 0; col < gridDimensions.N; col++) {
        const pixel = mappedPixelData[row][col];
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight
        );
      }
    }

    return canvas.toDataURL();
  }, [mappedPixelData, gridDimensions]);

  // 开启相机
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // 后置摄像头
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('无法访问相机:', error);
      setIsCapturing(false);
      setCameraError(true);
    }
  };

  // 拍照
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const photoDataURL = canvas.toDataURL('image/jpeg', 0.8);
    setUserPhoto(photoDataURL);

    // 停止相机
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCapturing(false);
  };

  // 跳过拍照，使用拼豆原图
  const skipPhoto = () => {
    const thumbnailDataURL = generateThumbnail();
    if (thumbnailDataURL) {
      setUserPhoto(thumbnailDataURL);
    }
  };

  // 生成打卡图
  const generateCompletionCard = useCallback(() => {
    if (!userPhoto || !cardCanvasRef.current) return null;

    const canvas = cardCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 检查是否使用的是拼豆原图（通过比较是否等于generateThumbnail的结果）
    const thumbnailDataURL = generateThumbnail();
    const isUsingPixelArt = userPhoto === thumbnailDataURL;

    // 动态计算画布尺寸
    const cardWidth = 720;
    const topPadding = 120; // 顶部标题区域
    const imageSize = Math.min(cardWidth * 0.9, 600); // 主图片尺寸，最大600px
    const bottomInfoHeight = 120; // 底部信息区域
    const bottomBrandHeight = 80; // 底部品牌区域
    const padding = 40; // 各区域间的间距
    
    const cardHeight = topPadding + imageSize + bottomInfoHeight + bottomBrandHeight + padding * 2;
    canvas.width = cardWidth;
    canvas.height = cardHeight;

    return new Promise<string>((resolve) => {
      // 加载用户照片/拼豆图
      const userImg = new Image();
      userImg.onload = () => {
        if (isUsingPixelArt) {
          // ===== 拼豆原图模式：原图占主导 =====
          
          // 深色渐变背景，更有质感
          const gradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(0.3, '#16213e');
          gradient.addColorStop(0.7, '#0f3460');
          gradient.addColorStop(1, '#533483');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cardWidth, cardHeight);

          // 计算拼豆图尺寸（占据80%的高度，居中显示）
          const imageMaxSize = Math.min(cardWidth * 0.9, cardHeight * 0.75);
          const imageSize = imageMaxSize;
          const imageX = (cardWidth - imageSize) / 2;
          const imageY = (cardHeight - imageSize) / 2 - 20; // 稍微往上偏移

          // 绘制主图片的装饰背景和阴影
          ctx.save();
          // 外层光晕效果
          const glowGradient = ctx.createRadialGradient(
            imageX + imageSize/2, imageY + imageSize/2, imageSize/2,
            imageX + imageSize/2, imageY + imageSize/2, imageSize/2 + 30
          );
          glowGradient.addColorStop(0, 'rgba(255,255,255,0.1)');
          glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(imageX - 30, imageY - 30, imageSize + 60, imageSize + 60);
          
          // 白色边框背景
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 15;
          const borderWidth = 12;
          ctx.fillRect(imageX - borderWidth, imageY - borderWidth, 
                      imageSize + borderWidth * 2, imageSize + borderWidth * 2);
          ctx.restore();

          // 绘制拼豆原图
          ctx.drawImage(userImg, imageX, imageY, imageSize, imageSize);

          // 顶部区域：简洁的完成标识
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 8;
          ctx.fillText('🎉 作品完成 🎉', cardWidth / 2, 80);
          ctx.shadowBlur = 0;

          // 底部信息区域：透明背景卡片
          const infoY = imageY + imageSize + 50;
          const infoHeight = 120;
          const infoX = 40;
          const infoWidth = cardWidth - 80;
          
          // 半透明背景
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
          
          // 信息文字
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⏱️ ${formatTime(totalElapsedTime)}`, cardWidth / 2, infoY + 35);
          
          ctx.font = '18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillText(`🔗 完成 ${totalBeads} 颗豆子`, cardWidth / 2, infoY + 65);

          // 底部品牌信息
          ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText('七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 50);
          ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 25);

          resolve(canvas.toDataURL('image/jpeg', 0.95));
          
        } else {
          // ===== 用户照片模式：照片占主导 =====
          
          // 温暖渐变背景
          const gradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
          gradient.addColorStop(0, '#ff9a9e');
          gradient.addColorStop(0.3, '#fecfef');
          gradient.addColorStop(0.7, '#fecfef');
          gradient.addColorStop(1, '#ff9a9e');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cardWidth, cardHeight);

          // 计算照片尺寸（占据大部分空间）
          const photoMaxSize = Math.min(cardWidth * 0.85, cardHeight * 0.7);
          const photoSize = photoMaxSize;
          const photoX = (cardWidth - photoSize) / 2;
          const photoY = (cardHeight - photoSize) / 2 - 30;

          // 绘制照片装饰背景和阴影
          ctx.save();
          // 外层装饰边框
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 8;
          ctx.strokeRect(photoX - 15, photoY - 15, photoSize + 30, photoSize + 30);
          
          // 内层白色边框背景
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
          ctx.fillRect(photoX - 12, photoY - 12, photoSize + 24, photoSize + 24);
          ctx.restore();

          // 绘制矩形照片
          ctx.drawImage(userImg, photoX, photoY, photoSize, photoSize);

          // 顶部完成标识
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 8;
          ctx.fillText('🎉 拼豆达成', cardWidth / 2, 100);
          ctx.shadowBlur = 0;

          // 底部信息卡片
          const infoCardY = photoY + photoSize + 40;
          const cardHeight2 = 140;
          const cardX = 60;
          const cardWidth2 = cardWidth - 120;
          
          // 信息卡片背景
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.shadowColor = 'rgba(0,0,0,0.1)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          ctx.fillRect(cardX, infoCardY, cardWidth2, cardHeight2);
          ctx.shadowBlur = 0;

          // 信息文字
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⏱️ 总用时 ${formatTime(totalElapsedTime)}`, cardWidth / 2, infoCardY + 40);
          
          ctx.font = '20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#666666';
          ctx.fillText(`🔗 共完成 ${totalBeads} 颗豆子`, cardWidth / 2, infoCardY + 75);

          // 添加小的拼豆原图作为装饰
          if (thumbnailDataURL) {
            const thumbnailImg = new Image();
            thumbnailImg.onload = () => {
              const thumbSize = 60;
              const thumbX = cardWidth / 2 - thumbSize / 2;
              const thumbY = infoCardY + 90;
              
                             // 绘制小缩略图背景
               ctx.fillStyle = '#ffffff';
               ctx.fillRect(thumbX - 3, thumbY - 3, thumbSize + 6, thumbSize + 6);
               
               // 绘制小缩略图
               ctx.drawImage(thumbnailImg, thumbX, thumbY, thumbSize, thumbSize);
               
               // 缩略图边框
               ctx.strokeStyle = '#ffffff';
               ctx.lineWidth = 3;
               ctx.strokeRect(thumbX - 3, thumbY - 3, thumbSize + 6, thumbSize + 6);

              // 底部品牌信息
              ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.textAlign = 'center';
              ctx.fillText('七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 50);
              ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 25);

              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            thumbnailImg.src = thumbnailDataURL;
          } else {
            // 底部品牌信息
            ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.textAlign = 'center';
            ctx.fillText('七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 50);
            ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 25);

            resolve(canvas.toDataURL('image/jpeg', 0.95));
          }
        }
      };
      userImg.src = userPhoto;
    });
  }, [userPhoto, totalElapsedTime, generateThumbnail, totalBeads]);

  // 下载打卡图
  const downloadCard = async () => {
    const cardDataURL = await generateCompletionCard();
    if (cardDataURL) {
      const link = document.createElement('a');
      link.download = `拼豆完成打卡-${new Date().toLocaleDateString()}.jpg`;
      link.href = cardDataURL;
      link.click();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              🎉 作品完成 🎉
            </h2>
            <div className="text-gray-600 space-y-1">
              <p>总用时：{formatTime(totalElapsedTime)}</p>
              <p>共完成：{totalBeads} 颗豆子</p>
            </div>
          </div>

          {!userPhoto ? (
            <div className="text-center">
              {!isCapturing ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    拍一张照片生成专属打卡图吧！
                  </p>
                  {cameraError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-yellow-800 text-sm">
                        📱 无法访问相机，可能是权限限制或设备不支持。<br/>
                        你可以选择使用作品图生成打卡图。
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={startCamera}
                      className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      📸 开启相机拍照
                    </button>
                    <button
                      onClick={skipPhoto}
                      className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      🎨 跳过拍照，使用作品图
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-xs mx-auto rounded-lg mb-4"
                  />
                  <button
                    onClick={takePhoto}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors mr-2"
                  >
                    📸 拍照
                  </button>
                  <button
                    onClick={() => {
                      const stream = videoRef.current?.srcObject as MediaStream;
                      stream?.getTracks().forEach(track => track.stop());
                      setIsCapturing(false);
                    }}
                    className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userPhoto}
                alt="用户照片"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <div className="space-y-3">
                <button
                  onClick={downloadCard}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                >
                  📥 下载打卡图
                </button>
                <button
                  onClick={() => setUserPhoto(null)}
                  className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  重新拍照
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>

      {/* 隐藏的canvas用于生成图片 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={cardCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CompletionCard; 