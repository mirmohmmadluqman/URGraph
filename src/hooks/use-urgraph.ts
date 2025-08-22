"use client"

import { useContext } from 'react';
import { URGraphContext } from '@/contexts/urgraph-provider';

export const useURGraph = () => {
  const context = useContext(URGraphContext);
  if (!context) {
    throw new Error('useURGraph must be used within a URGraphProvider');
  }
  return context;
};
