import React, { useEffect, useState } from 'react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  color?: string;
}

const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  isVisible,
  onComplete
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [confetti, setConfetti] = useState<Particle[]>([]);

  // emoji和彩带选项
  const celebrationEmojis = ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎁', '🏆'];
  const confettiColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];

  useEffect(() => {
    if (!isVisible) return;

    // 创建emoji粒子
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const isFromLeft = Math.random() < 0.5;
      newParticles.push({
        id: Date.now() + i,
        emoji: celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)],
        x: isFromLeft ? -50 : window.innerWidth + 50,
        y: Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2,
        vx: (isFromLeft ? 1 : -1) * (Math.random() * 3 + 2),
        vy: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scale: Math.random() * 0.5 + 0.8,
        opacity: 1
      });
    }

    // 创建彩带粒子
    const newConfetti: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const isFromLeft = Math.random() < 0.5;
      newConfetti.push({
        id: Date.now() + i + 1000,
        emoji: '',
        x: isFromLeft ? -20 : window.innerWidth + 20,
        y: Math.random() * window.innerHeight * 0.4 + window.innerHeight * 0.1,
        vx: (isFromLeft ? 1 : -1) * (Math.random() * 4 + 3),
        vy: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        scale: Math.random() * 0.3 + 0.2,
        opacity: 1,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
      });
    }

    setParticles(newParticles);
    setConfetti(newConfetti);

    // 动画循环
    let animationId: number;
    const animate = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        rotation: particle.rotation + particle.rotationSpeed,
        opacity: Math.max(0, particle.opacity - 0.02),
        vy: particle.vy + 0.1 // 重力效果
      })).filter(particle => 
        particle.x > -100 && 
        particle.x < window.innerWidth + 100 && 
        particle.y < window.innerHeight + 100 &&
        particle.opacity > 0
      ));

      setConfetti(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        rotation: particle.rotation + particle.rotationSpeed,
        opacity: Math.max(0, particle.opacity - 0.015),
        vy: particle.vy + 0.08 // 稍微轻一点的重力
      })).filter(particle => 
        particle.x > -50 && 
        particle.x < window.innerWidth + 50 && 
        particle.y < window.innerHeight + 50 &&
        particle.opacity > 0
      ));

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // 1.5秒后清理动画
    const timer = setTimeout(() => {
      setParticles([]);
      setConfetti([]);
      onComplete();
    }, 1500);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Emoji 粒子 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute text-2xl select-none"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            opacity: particle.opacity,
            fontSize: '24px'
          }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* 彩带粒子 */}
      {confetti.map(particle => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: '6px',
            height: '12px',
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            opacity: particle.opacity,
            borderRadius: '1px'
          }}
        />
      ))}

      {/* 中央庆祝文字 */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce"
        style={{
          animationDuration: '0.6s',
          animationTimingFunction: 'ease-out',
          animationFillMode: 'both'
        }}
      >
        <div className="text-4xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">
          🎉完成🎉
        </div>
        <div className="text-lg text-white drop-shadow-md mt-2">
          这个颜色拼完了！
        </div>
      </div>
    </div>
  );
};

export default CelebrationAnimation; 