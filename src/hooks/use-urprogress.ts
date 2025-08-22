"use client"

import { useContext } from 'react';
import { URProgressContext } from '@/contexts/urprogress-provider';

export const useURProgress = () => {
  const context = useContext(URProgressContext);
  if (!context) {
    throw new Error('useURProgress must be used within a URProgressProvider');
  }
  return context;
};
