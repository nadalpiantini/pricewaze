'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVisits } from '@/hooks/use-visits';
import { toast } from 'sonner';
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  XCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import type { Visit } from '@/types/visit';
import Link from 'next/link';

interface VisitsListProps {
  role?: 'visitor' | 'owner' | 'all';
  showVerificationCode?: boolean;
}

export function VisitsList({ role = 'all', showVerificationCode = false }: VisitsListProps) {
  const { visits, loading, error, fetchVisits, cancelVisit } = useVisits({ role });

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleCancel = async (visit: Visit) => {
    if (confirm('Are you sure you want to cancel this visit?')) {
      const success = await cancelVisit(visit.id);
      if (success) {
        toast.success('Visit cancelled');
        fetchVisits();
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const statusConfig = {
    scheduled: {
      badge: <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>,
      color: 'border-l-blue-500',
    },
    completed: {
      badge: <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>,
      color: 'border-l-green-500',
    },
    cancelled: {
      badge: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>,
      color: 'border-l-red-500',
    },
    no_show: {
      badge: <Badge variant="destructive">No Show</Badge>,
      color: 'border-l-orange-500',
    },
  };

  if (loading && visits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>{error}</p>
        <Button variant="outline" onClick={fetchVisits} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No visits found</p>
        <p className="text-sm">
          {role === 'visitor'
            ? 'Schedule a visit to a property to get started'
            : 'Visits to your properties will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => {
        const { date, time } = formatDate(visit.scheduled_at);
        const config = statusConfig[visit.status];
        const isVisitor = role === 'visitor' || (role === 'all' && visit.visitor);

        return (
          <Card key={visit.id} className={`border-l-4 ${config.color}`}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {config.badge}
                    <span className="text-sm text-muted-foreground">
                      {date} at {time}
                    </span>
                  </div>

                  {visit.property && (
                    <div className="mb-2">
                      <h3 className="font-medium truncate">{visit.property.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {visit.property.address}
                      </p>
                    </div>
                  )}

                  {isVisitor && visit.owner && (
                    <p className="text-sm text-muted-foreground">
                      Owner: {visit.owner.full_name}
                    </p>
                  )}

                  {!isVisitor && visit.visitor && (
                    <p className="text-sm text-muted-foreground">
                      Visitor: {visit.visitor.full_name}
                    </p>
                  )}

                  {/* Show verification code to owner for scheduled visits */}
                  {showVerificationCode &&
                    visit.status === 'scheduled' &&
                    visit.verification_code && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          Verification Code (share with visitor):
                        </p>
                        <p className="text-2xl font-mono font-bold tracking-widest">
                          {visit.verification_code}
                        </p>
                      </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/visits/${visit.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </Link>

                  {visit.status === 'scheduled' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancel(visit)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
