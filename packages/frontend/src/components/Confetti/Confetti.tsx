import { useEffect, useState } from "react";
import styles from "./Confetti.module.css";

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

const COLORS = [
  "#04d482", // accent green
  "#f97316", // orange
  "#eab308", // yellow
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export const Confetti = ({ trigger, onComplete }: ConfettiProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      // Generate 16 particles with varied properties
      const newParticles: Particle[] = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: 20 + Math.random() * 60, // spread across 20-80% of width
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.6,
      }));

      setParticles(newParticles);

      // Clean up after animation completes
      const timer = setTimeout(() => {
        setParticles([]);
        setIsActive(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger, isActive, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.confettiContainer} aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={styles.particle}
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
