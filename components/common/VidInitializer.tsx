'use client';

import { useEffect } from 'react';
import { getOrCreateVid } from '@/lib/utils/vid';

const VidInitializer = () => {
  useEffect(() => {
    getOrCreateVid();
  }, []);

  return null;
};

export default VidInitializer;
