'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RatingStars } from './RatingStars';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(3).max(100).optional(),
  comment: z.string().min(10).max(1000),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  propertyId: string;
  visitId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ propertyId, visitId, onSuccess, onCancel }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      comment: '',
    },
  });

  const comment = watch('comment');

  const onSubmit = async (data: ReviewFormData) => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          rating,
          title: data.title || null,
          comment: data.comment,
          visit_id: visitId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la reseña');
      }

      toast.success('Reseña creada exitosamente');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (value: number) => {
    setRating(value);
    setValue('rating', value, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Calificación *</Label>
        <div className="mt-2">
          <RatingStars
            rating={rating}
            interactive
            onRatingChange={handleRatingChange}
            size="lg"
          />
          {errors.rating && (
            <p className="text-sm text-red-500 mt-1">{errors.rating.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Título (opcional)</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Resumen de tu experiencia"
          className="mt-1"
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="comment">Comentario *</Label>
        <Textarea
          id="comment"
          {...register('comment')}
          placeholder="Comparte tu experiencia con esta propiedad..."
          className="mt-1 min-h-[120px]"
          maxLength={1000}
        />
        <div className="flex justify-between mt-1">
          {errors.comment && (
            <p className="text-sm text-red-500">{errors.comment.message}</p>
          )}
          <p className="text-sm text-muted-foreground ml-auto">
            {comment?.length || 0}/1000
          </p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || rating === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Publicar Reseña'
          )}
        </Button>
      </div>
    </form>
  );
}

