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

    // 根据实际比例计算缩略图尺寸，保持宽高比
    const aspectRatio = gridDimensions.N / gridDimensions.M;
    const maxThumbnailSize = 200;
    
    let thumbnailWidth, thumbnailHeight;
    if (aspectRatio > 1) {
      // 宽图
      thumbnailWidth = maxThumbnailSize;
      thumbnailHeight = maxThumbnailSize / aspectRatio;
    } else {
      // 高图或方图
      thumbnailHeight = maxThumbnailSize;
      thumbnailWidth = maxThumbnailSize * aspectRatio;
    }

    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;

    const cellWidth = thumbnailWidth / gridDimensions.N;
    const cellHeight = thumbnailHeight / gridDimensions.M;

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

    // 设置画布尺寸 (3:4比例，适合分享)
    const cardWidth = 720;
    const cardHeight = 960;
    canvas.width = cardWidth;
    canvas.height = cardHeight;

    return new Promise<string>((resolve) => {
      // 加载用户照片/拼豆图
      const userImg = new Image();
      userImg.onload = () => {
        if (isUsingPixelArt) {
          // ===== 拼豆原图模式：极简像素风格 =====
          
          // 统一的深色背景
          ctx.fillStyle = '#0A0A0A';
          ctx.fillRect(0, 0, cardWidth, cardHeight);

          // 计算拼豆图尺寸，保持原始宽高比
          const imgAspectRatio = userImg.naturalWidth / userImg.naturalHeight;
          const maxWidth = cardWidth * 0.8;
          const maxHeight = cardHeight * 0.65;
          
          let imageWidth, imageHeight;
          if (maxWidth / maxHeight > imgAspectRatio) {
            imageHeight = maxHeight;
            imageWidth = imageHeight * imgAspectRatio;
          } else {
            imageWidth = maxWidth;
            imageHeight = imageWidth / imgAspectRatio;
          }
          
          const imageX = (cardWidth - imageWidth) / 2;
          const imageY = (cardHeight - imageHeight) / 2 - 60;

          // 像素风格边框
          const pixelBorder = 4;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(imageX - pixelBorder, imageY - pixelBorder, 
                      imageWidth + pixelBorder * 2, imageHeight + pixelBorder * 2);
          
          // 内层暗色边框，增加层次
          ctx.fillStyle = '#333333';
          ctx.fillRect(imageX - pixelBorder + 1, imageY - pixelBorder + 1, 
                      imageWidth + (pixelBorder - 1) * 2, imageHeight + (pixelBorder - 1) * 2);

          // 绘制拼豆原图
          ctx.drawImage(userImg, imageX, imageY, imageWidth, imageHeight);

          // 底部信息区域
          const infoY = imageY + imageHeight + 60;
          
          // 创建信息背景条
          const infoBarHeight = 50;
          const infoBarWidth = cardWidth * 0.85;
          const infoBarX = (cardWidth - infoBarWidth) / 2;
          
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(infoBarX, infoY - 15, infoBarWidth, infoBarHeight);
          
          // 像素风格装饰线
          ctx.fillStyle = '#00FF88';
          ctx.fillRect(infoBarX, infoY - 15, infoBarWidth, 2);
          ctx.fillRect(infoBarX, infoY + infoBarHeight - 17, infoBarWidth, 2);

          // 信息文字 - 现代等宽字体风格
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '16px "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace';
          ctx.textAlign = 'center';
          
          const timeText = `TIME: ${formatTime(totalElapsedTime)}`;
          const beadText = `BEADS: ${totalBeads}`;
          ctx.fillText(`${timeText} | ${beadText}`, cardWidth / 2, infoY + 15);

          // 底部品牌信息 - 极简风格
          ctx.font = '12px "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace';
          ctx.fillStyle = '#666666';
          ctx.fillText('PERLER BEADS GENERATOR', cardWidth / 2, cardHeight - 30);
          ctx.font = '10px "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace';
          ctx.fillStyle = '#444444';
          ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 15);

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

          // 计算照片尺寸，保持原始宽高比
          const photoAspectRatio = userImg.naturalWidth / userImg.naturalHeight;
          const maxPhotoWidth = cardWidth * 0.85;
          const maxPhotoHeight = cardHeight * 0.6;
          
          let photoWidth, photoHeight;
          if (maxPhotoWidth / maxPhotoHeight > photoAspectRatio) {
            // 以高度为准
            photoHeight = maxPhotoHeight;
            photoWidth = photoHeight * photoAspectRatio;
          } else {
            // 以宽度为准
            photoWidth = maxPhotoWidth;
            photoHeight = photoWidth / photoAspectRatio;
          }
          
          const photoX = (cardWidth - photoWidth) / 2;
          const photoY = (cardHeight - photoHeight) / 2 - 80;

          // 绘制照片装饰背景和阴影
          ctx.save();
          // 外层装饰边框
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 8;
          ctx.strokeRect(photoX - 15, photoY - 15, photoWidth + 30, photoHeight + 30);
          
          // 内层白色边框背景
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
          ctx.fillRect(photoX - 12, photoY - 12, photoWidth + 24, photoHeight + 24);
          ctx.restore();

          // 绘制照片（保持宽高比）
          ctx.drawImage(userImg, photoX, photoY, photoWidth, photoHeight);



          // 底部信息区域：直接显示文字
          const infoCardY = photoY + photoHeight + 30;

          // 信息文字 - 一行显示
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 8;
          ctx.fillText(`⏱️ 总用时 ${formatTime(totalElapsedTime)} | 🔗 共完成 ${totalBeads} 颗豆子`, cardWidth / 2, infoCardY + 35);

          // 添加小的拼豆原图作为装饰
          if (thumbnailDataURL) {
            const thumbnailImg = new Image();
            thumbnailImg.onload = () => {
              // 计算小缩略图尺寸，保持比例
              const maxThumbSize = 60;
              const thumbAspectRatio = thumbnailImg.naturalWidth / thumbnailImg.naturalHeight;
              
              let thumbWidth, thumbHeight;
              if (thumbAspectRatio > 1) {
                // 宽图
                thumbWidth = maxThumbSize;
                thumbHeight = maxThumbSize / thumbAspectRatio;
              } else {
                // 高图或方图
                thumbHeight = maxThumbSize;
                thumbWidth = maxThumbSize * thumbAspectRatio;
              }
              
              const thumbX = cardWidth / 2 - thumbWidth / 2;
              const thumbY = infoCardY + 80;
              
              // 绘制小缩略图背景
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = 'rgba(0,0,0,0.3)';
              ctx.shadowBlur = 8;
              ctx.fillRect(thumbX - 3, thumbY - 3, thumbWidth + 6, thumbHeight + 6);
              ctx.shadowBlur = 0;
               
              // 绘制小缩略图（保持宽高比）
              ctx.drawImage(thumbnailImg, thumbX, thumbY, thumbWidth, thumbHeight);
               
              // 缩略图边框
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3;
              ctx.strokeRect(thumbX - 3, thumbY - 3, thumbWidth + 6, thumbHeight + 6);

              // 底部品牌信息
              ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.textAlign = 'center';
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 4;
              ctx.fillText('七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 40);
              ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 20);
              ctx.shadowBlur = 0;

              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            thumbnailImg.src = thumbnailDataURL;
          } else {
            // 底部品牌信息
            ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText('七卡瓦拼豆底稿生成器', cardWidth / 2, cardHeight - 40);
            ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText('perlerbeads.zippland.com', cardWidth / 2, cardHeight - 20);
            ctx.shadowBlur = 0;

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