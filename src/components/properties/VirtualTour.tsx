'use client';

import { useEffect, useRef } from 'react';
import type { PropertyMedia } from '@/types/database';

interface VirtualTourProps {
  media: PropertyMedia;
  className?: string;
}

export function VirtualTour({ media, className = '' }: VirtualTourProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || media.media_type !== 'virtual_tour' && media.media_type !== 'video_360') {
      return;
    }

    // Dynamically import pannellum
    import('pannellum').then((pannellum) => {
      if (!containerRef.current || viewerRef.current) return;

      const config = {
        type: 'equirectangular',
        panorama: media.url,
        autoLoad: true,
        autoRotate: 0,
        compass: true,
        ...(media.metadata as Record<string, unknown>),
      };

      try {
        viewerRef.current = pannellum.viewer(containerRef.current, config);
      } catch (error) {
        console.error('Error initializing Pannellum viewer:', error);
      }
    });

    return () => {
      if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [media]);

  if (media.media_type !== 'virtual_tour' && media.media_type !== 'video_360') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-video rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}

