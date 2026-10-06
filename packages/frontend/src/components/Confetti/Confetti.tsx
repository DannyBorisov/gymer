import { useEffect, useState } from "react";
import styles from "./Confetti.module.css";

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  color: string;
  scale: number;
  shape: "square" | "rect" | "circle";
  angle: number;
  distance: number;
  spin: number;
  delay: number;
}

const COLORS = [
  "#c9432a",
  "#f97316",
  "#eab308",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
  "#10b981",
];

const SHAPES: Particle["shape"][] = ["square", "rect", "circle"];

export const Confetti = ({ trigger, onComplete }: ConfettiProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      // Generate particles exploding in all directions from center
      const newParticles: Particle[] = Array.from({ length: 240 }, (_, i) => ({
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        scale: 0.5 + Math.random() * 1,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        angle: Math.random() * 360, // all directions
        distance: 30 + Math.random() * 50, // how far to explode (in vmin)
        spin: Math.random() * 1080,
        delay: Math.random() * 0.15,
      }));

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        setIsActive(false);
        onComplete?.();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [trigger, isActive, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.confettiContainer} aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`${styles.particle} ${styles[particle.shape]}`}
          style={{
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            "--angle": `${particle.angle}deg`,
            "--distance": `${particle.distance}vmin`,
            "--spin": `${particle.spin}deg`,
            "--scale": particle.scale,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Confetti;
