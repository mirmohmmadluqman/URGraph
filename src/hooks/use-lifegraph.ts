"use client"

import { useContext } from 'react';
import { LifeGraphContext } from '@/contexts/lifegraph-provider';

export const useLifeGraph = () => {
  const context = useContext(LifeGraphContext);
  if (!context) {
    throw new Error('useLifeGraph must be used within a LifeGraphProvider');
  }
  return context;
};
