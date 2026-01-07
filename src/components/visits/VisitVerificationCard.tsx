'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useVisits } from '@/hooks/use-visits';
import { ReportSignalButtons } from '@/components/signals';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { MapPin, Navigation, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { Visit } from '@/types/visit';

interface VisitVerificationCardProps {
  visit: Visit;
  onVerified?: (visit: Visit) => void;
}

export function VisitVerificationCard({ visit, onVerified }: VisitVerificationCardProps) {
  const [code, setCode] = useState('');
  const [gpsPosition, setGpsPosition] = useState<GeolocationPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const { verifyVisit, loading } = useVisits();
  const { user } = useAuthStore();

  const isScheduled = visit.status === 'scheduled';
  const isCompleted = visit.status === 'completed';
  const isCancelled = visit.status === 'cancelled';

  // Get current GPS position
  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setLoadingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition(position);
        setLoadingGps(false);
        toast.success('Location acquired', {
          description: `Accuracy: ${Math.round(position.coords.accuracy)}m`,
        });
      },
      (error) => {
        setLoadingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setGpsError('Location request timed out.');
            break;
          default:
            setGpsError('An unknown error occurred.');
        }
        toast.error('Failed to get location', { description: error.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Auto-get GPS position on mount for scheduled visits
  useEffect(() => {
    if (isScheduled) {
      getCurrentPosition();
    }
  }, [isScheduled]);

  const handleVerify = async () => {
    if (!gpsPosition) {
      toast.error('Location required', { description: 'Please allow location access to verify your visit.' });
      return;
    }

    if (code.length !== 6) {
      toast.error('Invalid code', { description: 'Please enter the 6-digit verification code.' });
      return;
    }

    const result = await verifyVisit(visit.id, {
      verification_code: code,
      latitude: gpsPosition.coords.latitude,
      longitude: gpsPosition.coords.longitude,
    });

    if (result?.success) {
      toast.success('Visit verified!', {
        description: `You were ${result.verification.distance}m from the property.`,
      });
      onVerified?.(result.visit);
    } else if (result === null) {
      // Error was set by the hook
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusBadge = {
    scheduled: <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>,
    completed: <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>,
    cancelled: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>,
    no_show: <Badge variant="destructive">No Show</Badge>,
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{visit.property?.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {visit.property?.address}
            </CardDescription>
          </div>
          {statusBadge[visit.status]}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p><strong>Scheduled:</strong> {formatDate(visit.scheduled_at)}</p>
          {visit.owner && (
            <p><strong>Property Owner:</strong> {visit.owner.full_name}</p>
          )}
        </div>

        {isCompleted && visit.verified_at && (
          <>
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Visit Verified</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Verified on {formatDate(visit.verified_at)}
              </p>
            </div>
            
            {/* Report Signals (Waze-style) - Only show to the visitor */}
            {user?.id === visit.visitor_id && visit.property_id && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <ReportSignalButtons
                  propertyId={visit.property_id}
                  visitId={visit.id}
                  onSignalReported={() => {
                    // Optionally refresh or show feedback
                  }}
                />
              </div>
            )}
          </>
        )}

        {isScheduled && (
          <>
            {/* GPS Status */}
            <div className="space-y-2">
              <Label>Your Location</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentPosition}
                  disabled={loadingGps}
                >
                  {loadingGps ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  {gpsPosition ? 'Refresh Location' : 'Get Location'}
                </Button>
                {gpsPosition && (
                  <span className="text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Location acquired
                  </span>
                )}
              </div>
              {gpsError && (
                <p className="text-sm text-destructive">{gpsError}</p>
              )}
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code provided by the property owner
              </p>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </>
        )}

        {isCancelled && (
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Visit Cancelled</span>
            </div>
          </div>
        )}
      </CardContent>

      {isScheduled && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={loading || !gpsPosition || code.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Visit
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
