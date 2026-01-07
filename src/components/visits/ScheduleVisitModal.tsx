'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisits } from '@/hooks/use-visits';
import { toast } from 'sonner';
import { Calendar, Clock, Loader2, MapPin } from 'lucide-react';

interface ScheduleVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    title: string;
    address: string;
  };
  onScheduled?: () => void;
}

export function ScheduleVisitModal({
  open,
  onOpenChange,
  property,
  onScheduled,
}: ScheduleVisitModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const { scheduleVisit, loading } = useVisits();

  // Get min date (today) and max date (30 days from now)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !time) {
      toast.error('Please select a date and time');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);

    if (scheduledAt < new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    const visit = await scheduleVisit({
      property_id: property.id,
      scheduled_at: scheduledAt.toISOString(),
      notes: notes || undefined,
    });

    if (visit) {
      toast.success('Visit scheduled!', {
        description: `Your visit is confirmed for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
      onOpenChange(false);
      onScheduled?.();
      // Reset form
      setDate('');
      setTime('');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule a Visit
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {property.title} - {property.address}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                max={maxDate}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Any special requests or questions?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="text-muted-foreground space-y-1">
              <li>1. The property owner will be notified</li>
              <li>2. Arrive at the property at the scheduled time</li>
              <li>3. Get the 6-digit code from the owner</li>
              <li>4. Verify your visit using GPS + code</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Visit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
