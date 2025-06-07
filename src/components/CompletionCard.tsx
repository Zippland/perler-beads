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

    // 设置画布尺寸 (比例适合分享)
    const cardWidth = 800;
    const cardHeight = 1000;
    canvas.width = cardWidth;
    canvas.height = cardHeight;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    return new Promise<string>((resolve) => {
      // 加载用户照片/拼豆图
      const userImg = new Image();
      userImg.onload = () => {
        if (isUsingPixelArt) {
          // 使用拼豆原图的布局 - 重新设计让图片占主要空间
          const padding = 40;
          const topSpace = 80;
          const bottomSpace = 120;
          
          // 计算拼豆图尺寸（占据大部分空间）
          const availableHeight = cardHeight - topSpace - bottomSpace;
          const availableWidth = cardWidth - padding * 2;
          const imageSize = Math.min(availableWidth, availableHeight);
          
          const imageX = (cardWidth - imageSize) / 2;
          const imageY = topSpace;
          
          // 标题（放在顶部，比较小）
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 24px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎉 作品完成！🎉', cardWidth / 2, 40);

          // 绘制拼豆图（大图）
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          ctx.fillRect(imageX - 8, imageY - 8, imageSize + 16, imageSize + 16);
          ctx.shadowBlur = 0;
          ctx.drawImage(userImg, imageX, imageY, imageSize, imageSize);

          // 时长和豆子数信息（紧贴图片下方）
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px Arial, sans-serif';
          ctx.fillText(`⏱️ ${formatTime(totalElapsedTime)}`, cardWidth / 2, imageY + imageSize + 30);
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText(`🔗 ${totalBeads}颗豆子`, cardWidth / 2, imageY + imageSize + 55);

          // 网站信息（底部，更小）
          ctx.font = '14px Arial, sans-serif';
          ctx.fillText('来自 七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 60);
          ctx.font = '12px Arial, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 35);

          // 装饰元素（更小，分布在四角）
          const cornerEmojis = ['🎨', '🌟', '🎊', '✨'];
          ctx.font = '20px Arial, sans-serif';
          ctx.fillStyle = '#fff';
          
          // 四个角落的装饰
          const cornerPositions = [
            { x: 60, y: 120 },  // 左上
            { x: cardWidth - 60, y: 120 },  // 右上
            { x: 60, y: imageY + imageSize - 40 },  // 左下
            { x: cardWidth - 60, y: imageY + imageSize - 40 }  // 右下
          ];
          
          cornerEmojis.forEach((emoji, index) => {
            if (cornerPositions[index]) {
              ctx.fillText(emoji, cornerPositions[index].x, cornerPositions[index].y);
            }
          });

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          // 原来的用户照片布局
          const photoSize = 200;
          const photoX = (cardWidth - photoSize) / 2;
          const photoY = 60;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(userImg, photoX, photoY, photoSize, photoSize);
          ctx.restore();

          // 绘制圆形边框
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
          ctx.stroke();

          // 标题
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 32px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎉 作品完成！', cardWidth / 2, photoY + photoSize + 60);

          // 时长和豆子数
          ctx.font = '22px Arial, sans-serif';
          ctx.fillText(`总用时：${formatTime(totalElapsedTime)}`, cardWidth / 2, photoY + photoSize + 90);
          ctx.font = '18px Arial, sans-serif';
          ctx.fillText(`共拼了 ${totalBeads} 颗豆子`, cardWidth / 2, photoY + photoSize + 115);

          // 原图缩略图
          if (thumbnailDataURL) {
            const thumbnailImg = new Image();
            thumbnailImg.onload = () => {
              const thumbSize = 180;
              const thumbX = (cardWidth - thumbSize) / 2;
              const thumbY = photoY + photoSize + 155;
              
              // 绘制缩略图背景
              ctx.fillStyle = '#fff';
              ctx.fillRect(thumbX - 10, thumbY - 10, thumbSize + 20, thumbSize + 20);
              ctx.drawImage(thumbnailImg, thumbX, thumbY, thumbSize, thumbSize);

              // 缩略图标题
              ctx.fillStyle = '#fff';
              ctx.font = '18px Arial, sans-serif';
              ctx.fillText('作品图案', cardWidth / 2, thumbY + thumbSize + 40);

              // 网站信息
              ctx.font = '16px Arial, sans-serif';
              ctx.fillText('来自 七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 80);
              ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 50);

              // 装饰元素
              const decorEmojis = ['🎨', '🌟', '🎊', '💫'];
              ctx.font = '24px Arial, sans-serif';
              decorEmojis.forEach((emoji, index) => {
                const angle = (index * Math.PI * 2) / decorEmojis.length;
                const radius = 120;
                const x = cardWidth / 2 + Math.cos(angle) * radius;
                const y = photoY + photoSize / 2 + Math.sin(angle) * radius;
                ctx.fillText(emoji, x, y);
              });

              resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            thumbnailImg.src = thumbnailDataURL;
          } else {
            resolve(canvas.toDataURL('image/jpeg', 0.9));
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
              🎉 作品完成！
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