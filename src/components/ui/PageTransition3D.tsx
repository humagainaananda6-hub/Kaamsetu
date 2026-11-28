import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface PageTransition3DProps {
  transitionKey: string;
  direction?: 1 | -1;
  children: React.ReactNode;
}

export const PageTransition3D: React.FC<PageTransition3DProps> = ({
  transitionKey,
  direction = 1,
  children,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative z-10 min-h-screen w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  const d = direction >= 0 ? 1 : -1;
  const enterRotateY = d * 38;
  const exitRotateY = d * -38;
  const enterX = d * 96;
  const exitX = d * -96;

  return (
    <div
      className="relative z-10 w-full min-h-screen overflow-hidden"
      style={{ perspective: '1400px', perspectiveOrigin: '50% 40%' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={transitionKey}
          data-testid="kbn-page-transition-3d"
          initial={{
            opacity: 0.15,
            x: enterX,
            z: -160,
            rotateY: enterRotateY,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            x: 0,
            z: 0,
            rotateY: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0.1,
            x: exitX,
            z: -160,
            rotateY: exitRotateY,
            scale: 0.96,
          }}
          transition={{
            duration: 0.24,
            ease: [0.65, 0, 0.25, 1],
          }}
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 45%',
            backfaceVisibility: 'hidden',
            willChange: 'transform, opacity',
          }}
          className="min-h-screen w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const TabTransition3D: React.FC<{
  tabKey: string;
  children: React.ReactNode;
}> = ({ tabKey, children }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div key={tabKey}>{children}</div>;
  }

  return (
    <div style={{ perspective: '1200px' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tabKey}
          initial={{ opacity: 0, rotateY: 14, z: -60, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, rotateY: 0, z: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: -12, z: -60, y: -6, scale: 0.98 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
