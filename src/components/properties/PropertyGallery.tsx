'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, ImageIcon } from 'lucide-react';
import type { PropertyMedia } from '@/types/database';

interface PropertyGalleryProps {
  images: string[];
  media?: PropertyMedia[];
  propertyTitle?: string;
}

type MediaCategory = 'all' | 'exterior' | 'interior' | 'floor_plan' | 'amenities' | 'other';

export function PropertyGallery({ images, media, propertyTitle = 'Property' }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory>('all');

  // Use media if available, otherwise fall back to images array
  const allMedia = useMemo(() => {
    if (media && media.length > 0) {
      return media;
    }
    // Convert images array to media format
    return images.map((url, index) => ({
      id: `img-${index}`,
      property_id: '',
      media_type: 'image' as const,
      category: null,
      url,
      thumbnail_url: url,
      order_index: index,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [media, images]);

  // Filter by category
  const filteredMedia = useMemo(() => {
    if (selectedCategory === 'all') return allMedia;
    return allMedia.filter((item) => item.category === selectedCategory);
  }, [allMedia, selectedCategory]);

  // Get categories present in media
  const categories = useMemo(() => {
    const cats = new Set<MediaCategory>(['all']);
    allMedia.forEach((item) => {
      if (item.category) {
        cats.add(item.category as MediaCategory);
      }
    });
    return Array.from(cats);
  }, [allMedia]);

  // Prepare slides for lightbox
  const slides = useMemo(() => {
    return filteredMedia.map((item) => ({
      src: item.url,
      alt: `${propertyTitle} - ${item.category || 'image'}`,
      title: item.category ? `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} View` : undefined,
    }));
  }, [filteredMedia, propertyTitle]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Group media by type for display
  const imagesOnly = filteredMedia.filter((m) => m.media_type === 'image');
  const virtualTours = filteredMedia.filter((m) => m.media_type === 'virtual_tour' || m.media_type === 'video_360');

  if (allMedia.length === 0) {
    return (
      <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      {categories.length > 1 && (
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as MediaCategory)}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Main Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {imagesOnly.map((item, index) => {
          const globalIndex = allMedia.indexOf(item);
          return (
            <div
              key={item.id}
              className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg bg-muted"
              onClick={() => openLightbox(globalIndex)}
            >
              <Image
                src={item.thumbnail_url || item.url}
                alt={`${propertyTitle} - ${index + 1}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {index === 0 && imagesOnly.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                  +{imagesOnly.length - 1}
                </div>
              )}
              {item.category && (
                <Badge className="absolute bottom-2 left-2 text-xs">
                  {item.category.replace('_', ' ')}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Virtual Tours Section */}
      {virtualTours.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Virtual Tours</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {virtualTours.map((tour) => (
              <div
                key={tour.id}
                className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group"
              >
                {tour.thumbnail_url ? (
                  <Image
                    src={tour.thumbnail_url}
                    alt="Virtual Tour"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-emerald-500">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Badge className="bg-white/90 text-gray-900">
                    <Play className="h-4 w-4 mr-1" />
                    360° Tour
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Thumbnails, Zoom]}
        thumbnails={{
          position: 'bottom',
          width: 120,
          height: 80,
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
      />
    </div>
  );
}

