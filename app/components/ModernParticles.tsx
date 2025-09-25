import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface ModernParticlesProps {
  className?: string;
}

export default function ModernParticles({ className = '' }: ModernParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    const maxDistance = 150;
    const colors = ['rgba(99, 102, 241, 0.6)', 'rgba(139, 92, 246, 0.6)', 'rgba(168, 85, 247, 0.6)'];

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
    };

    const createParticle = (): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5; // 최소 0.5, 최대 2.0 속도
      
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(80, Math.floor((width * height) / 12000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };

    const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
      // 파티클 그리기
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawConnections = (ctx: CanvasRenderingContext2D) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.3;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    const updateParticle = (particle: Particle, time: number) => {
      // 마우스와의 상호작용 - 끌어당기는 효과
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 150 && distance > 0) {
        const force = (150 - distance) / 150;
        particle.vx += (dx / distance) * force * 0.003;
        particle.vy += (dy / distance) * force * 0.003;
      }

      // 지속적인 랜덤 움직임 추가 (브라운 운동처럼)
      particle.vx += (Math.random() - 0.5) * 0.02;
      particle.vy += (Math.random() - 0.5) * 0.02;
      
      // 주기적인 파동 효과 추가
      const waveX = Math.sin(time * 0.001 + particle.x * 0.01) * 0.01;
      const waveY = Math.cos(time * 0.0015 + particle.y * 0.01) * 0.01;
      particle.vx += waveX;
      particle.vy += waveY;

      // 위치 업데이트
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 경계에서 반사 (에너지 손실 최소화)
      if (particle.x <= 0 || particle.x >= width) {
        particle.vx *= -0.9; // 더 적은 에너지 손실
        particle.x = Math.max(0, Math.min(width, particle.x));
        // 경계에서 추가 에너지 공급
        particle.vy += (Math.random() - 0.5) * 0.5;
      }
      if (particle.y <= 0 || particle.y >= height) {
        particle.vy *= -0.9; // 더 적은 에너지 손실
        particle.y = Math.max(0, Math.min(height, particle.y));
        // 경계에서 추가 에너지 공급
        particle.vx += (Math.random() - 0.5) * 0.5;
      }

      // 속도 제한
      const maxSpeed = 2.5;
      const minSpeed = 0.3; // 최소 속도 보장
      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      
      if (speed > maxSpeed) {
        particle.vx = (particle.vx / speed) * maxSpeed;
        particle.vy = (particle.vy / speed) * maxSpeed;
      } else if (speed < minSpeed && speed > 0) {
        // 최소 속도 미달 시 속도 증가
        particle.vx = (particle.vx / speed) * minSpeed;
        particle.vy = (particle.vy / speed) * minSpeed;
      } else if (speed === 0) {
        // 완전히 멈춘 경우 랜덤 방향으로 움직임 부여
        const angle = Math.random() * Math.PI * 2;
        particle.vx = Math.cos(angle) * minSpeed;
        particle.vy = Math.sin(angle) * minSpeed;
      }

      // 매우 약한 감쇠 (거의 감쇠하지 않음)
      particle.vx *= 0.999;
      particle.vy *= 0.999;
    };

    const animate = (currentTime: number = 0) => {
      ctx.clearRect(0, 0, width, height);

      // 연결선 먼저 그리기
      drawConnections(ctx);
      
      // 파티클 업데이트 및 그리기
      particles.forEach(particle => {
        updateParticle(particle, currentTime);
        drawParticle(ctx, particle);
      });

      animationIdRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    // 초기화
    resizeCanvas();
    initParticles();
    
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    animate();
    setIsLoaded(true);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        transition: 'opacity 1s ease-in-out',
        background: 'transparent'
      }}
    />
  );
}