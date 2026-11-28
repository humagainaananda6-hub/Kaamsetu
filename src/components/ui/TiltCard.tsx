import React, { useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
  depth?: number;
  as?: 'div' | 'article' | 'section';
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 10,
  depth = 12,
  as = 'div',
  style,
  ...rest
}) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<string>('');

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const y = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    setTransform(
      `perspective(1000px) rotateY(${(x * maxTilt).toFixed(2)}deg) rotateX(${(-y * maxTilt).toFixed(2)}deg) translateZ(${depth}px)`,
    );
  };

  const handlePointerLeave = () => {
    if (transform) setTransform('');
  };

  const Component = as;

  return (
    <Component
      ref={ref as any}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        transform: transform || undefined,
        ...style,
      }}
      {...(rest as any)}
    >
      {children}
    </Component>
  );
};
