'use client';

import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1.0] as const,
};

interface PageTransitionProps {
  routeKey: string;
  children: React.ReactNode;
}

export function PageTransition({ routeKey, children }: PageTransitionProps) {
  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={routeKey}
        variants={pageVariants}
        initial='initial'
        animate='animate'
        exit='exit'
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
