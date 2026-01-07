'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisits } from '@/hooks/use-visits';
import { useAuthStore } from '@/stores/auth-store';
import type { Visit, VisitStatus } from '@/types/visit';

const statusConfig: Record<
  VisitStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'outline' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VisitsPage() {
  const { user } = useAuthStore();
  const { visits, loading, fetchVisits, cancelVisit, verifyVisit } = useVisits({ role: 'all' });
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);

  // Initialize dates only on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setSelectedDate(new Date());
    setCurrentMonth(new Date());
  }, []);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const calendarDays = useMemo(() => {
    if (!currentMonth) return [];
    return getDaysInMonth(currentMonth);
  }, [currentMonth]);

  const getVisitsForDate = useCallback((date: Date) => {
    return visits.filter((visit) => {
      const visitDate = new Date(visit.scheduled_at);
      return (
        visitDate.getDate() === date.getDate() &&
        visitDate.getMonth() === date.getMonth() &&
        visitDate.getFullYear() === date.getFullYear()
      );
    });
  }, [visits]);

  const selectedDateVisits = useMemo(
    () => selectedDate ? getVisitsForDate(selectedDate) : [],
    [selectedDate, getVisitsForDate]
  );

  const upcomingVisits = useMemo(() => {
    const now = new Date();
    return visits
      .filter(
        (v) => v.status === 'scheduled' && new Date(v.scheduled_at) > now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
      .slice(0, 5);
  }, [visits]);

  const prevMonth = () => {
    if (!currentMonth) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    if (!currentMonth) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const handleCancelVisit = async (visitId: string) => {
    const success = await cancelVisit(visitId);
    if (success) {
      fetchVisits();
    }
  };

  const handleVerifyClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setVerificationCode('');
    setVerifyDialogOpen(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedVisit || !verificationCode) return;

    setVerifying(true);
    try {
      const result = await verifyVisit(selectedVisit.id, {
        verification_code: verificationCode,
      });

      if (result) {
        setVerifyDialogOpen(false);
        setSelectedVisit(null);
        fetchVisits();
      }
    } finally {
      setVerifying(false);
    }
  };

  const isOwner = (visit: Visit) => visit.owner_id === user?.id;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visits</h1>
        <p className="text-muted-foreground">
          Schedule and manage property visits
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>
                {currentMonth?.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                }) || 'Loading...'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="aspect-square" />;
                  }

                  const dayVisits = getVisitsForDate(date);
                  const hasVisits = dayVisits.length > 0;
                  const isSelected = isSameDay(date, selectedDate);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square p-1 rounded-lg text-sm transition-colors relative
                        ${isToday(date) ? 'bg-primary/10 font-semibold' : ''}
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                      `}
                    >
                      <span>{date.getDate()}</span>
                      {hasVisits && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayVisits.slice(0, 3).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? 'bg-primary-foreground' : 'bg-primary'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected date visits */}
              {selectedDate && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                {selectedDateVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No visits scheduled for this day.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                          {visit.property?.images?.[0] ? (
                            <Image
                              src={visit.property.images[0]}
                              alt={visit.property.title || ''}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {visit.property?.title || 'Property'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(visit.scheduled_at)}
                          </p>
                        </div>
                        <Badge variant={statusConfig[visit.status].variant}>
                          {statusConfig[visit.status].label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming visits */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Visits</CardTitle>
              <CardDescription>Your next scheduled visits</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingVisits.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No upcoming visits scheduled
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingVisits.map((visit) => (
                    <div key={visit.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {visit.property?.images?.[0] ? (
                            <Image
                              src={visit.property.images[0]}
                              alt={visit.property.title || ''}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/properties/${visit.property_id}`}
                            className="font-medium text-sm hover:underline line-clamp-1"
                          >
                            {visit.property?.title || 'Property'}
                          </Link>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(visit.scheduled_at)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(visit.scheduled_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner(visit) && visit.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleVerifyClick(visit)}
                          >
                            <QrCode className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                        )}
                        {visit.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => handleCancelVisit(visit.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify visit dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Visit</DialogTitle>
            <DialogDescription>
              Enter the verification code to confirm the visit took place.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter the code"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerifyDialogOpen(false)}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button onClick={handleVerifySubmit} disabled={verifying || !verificationCode}>
              {verifying ? 'Verifying...' : 'Verify Visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
