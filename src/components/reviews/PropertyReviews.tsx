'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RatingStars } from './RatingStars';
import { ReviewForm } from './ReviewForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThumbsUp, MessageSquare, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Review } from '@/types/database';

interface PropertyReviewsProps {
  propertyId: string;
  userId?: string;
  visitId?: string;
}

type SortOption = 'recent' | 'helpful' | 'highest' | 'lowest';

export function PropertyReviews({ propertyId, userId, visitId }: PropertyReviewsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const queryClient = useQueryClient();

  // Fetch reviews
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', propertyId, sortBy],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/properties/${propertyId}?sort=${sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json() as Promise<{ reviews: Review[]; averageRating: number; totalReviews: number }>;
    },
  });

  // Check if user has already reviewed
  const { data: userReview } = useQuery({
    queryKey: ['user-review', propertyId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/reviews/properties/${propertyId}?user_id=${userId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.reviews?.[0] as Review | null;
    },
    enabled: !!userId,
  });

  // Mark review as helpful
  const markHelpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark as helpful');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', propertyId] });
    },
  });

  const handleMarkHelpful = (reviewId: string) => {
    markHelpfulMutation.mutate(reviewId);
    toast.success('Gracias por tu feedback');
  };

  const sortedReviews = reviewsData?.reviews || [];
  const averageRating = reviewsData?.averageRating || 0;
  const totalReviews = reviewsData?.totalReviews || 0;

  return (
    <div className="space-y-6">
      {/* Header with Rating Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Reseñas y Calificaciones</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RatingStars rating={averageRating} size="lg" />
                  <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
                </div>
              </div>
            </div>
            {!userReview && userId && (
              <Button onClick={() => setShowReviewForm(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Escribir Reseña
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Sort and Filter */}
      {totalReviews > 0 && (
        <div className="flex items-center justify-between">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="helpful">Más útiles</SelectItem>
              <SelectItem value="highest">Mayor calificación</SelectItem>
              <SelectItem value="lowest">Menor calificación</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando reseñas...</div>
      ) : sortedReviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No hay reseñas aún</p>
            <p className="text-sm text-muted-foreground">
              Sé el primero en compartir tu experiencia
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="font-semibold">
                          {review.user?.full_name || 'Usuario Anónimo'}
                        </p>
                        {review.verified_visit && (
                          <Badge variant="secondary" className="mt-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Visita Verificada
                          </Badge>
                        )}
                      </div>
                    </div>
                    <RatingStars rating={review.rating} size="sm" className="mb-2" />
                    {review.title && (
                      <h4 className="font-medium mt-2 mb-1">{review.title}</h4>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkHelpful(review.id)}
                    className="text-muted-foreground"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Útil ({review.helpful_count})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escribir Reseña</DialogTitle>
          </DialogHeader>
          <ReviewForm
            propertyId={propertyId}
            visitId={visitId}
            onSuccess={() => {
              setShowReviewForm(false);
              queryClient.invalidateQueries({ queryKey: ['reviews', propertyId] });
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

