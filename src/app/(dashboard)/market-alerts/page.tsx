'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { MarketAlertsFeed } from '@/components/alerts/MarketAlertsFeed';
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarketAlertsPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [showBuilder, setShowBuilder] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    });
  }, [supabase, router]);

  // Fetch user's alert rules
  const { data: rules = [], refetch: refetchRules } = useQuery({
    queryKey: ['alert-rules', userId],
    queryFn: async () => {
      if (!userId) return [];

      const response = await fetch('/api/alert-rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      return response.json();
    },
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Market Alerts</h1>
          <p className="text-muted-foreground">
            Get notified when market conditions change, just like Waze alerts you about traffic
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
          <Button onClick={() => setShowBuilder(!showBuilder)}>
            <Plus className="h-4 w-4 mr-2" />
            New Alert Rule
          </Button>
        </div>
      </div>

      {/* Alert Rule Builder */}
      {showBuilder && (
        <div className="mb-6">
          <AlertRuleBuilder
            onSave={() => {
              setShowBuilder(false);
              refetchRules();
            }}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            Active Alerts
            {rules.filter((r: any) => r.active).length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({rules.filter((r: any) => r.active).length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">
            My Rules
            {rules.length > 0 && <span className="ml-2 text-xs text-muted-foreground">({rules.length})</span>}
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <MarketAlertsFeed userId={userId} maxItems={50} />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No alert rules yet</p>
                <Button onClick={() => setShowBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{rule.name}</CardTitle>
                        {rule.description && (
                          <CardDescription className="mt-1">{rule.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={rule.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={async () => {
                            const response = await fetch('/api/alert-rules', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: rule.id, active: !rule.active }),
                            });
                            if (response.ok) refetchRules();
                          }}
                        >
                          {rule.active ? 'Active' : 'Inactive'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Delete this alert rule?')) {
                              const response = await fetch(`/api/alert-rules?id=${rule.id}`, {
                                method: 'DELETE',
                              });
                              if (response.ok) refetchRules();
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Rule:</strong>{' '}
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(rule.rule, null, 2)}
                        </code>
                      </div>
                      <div>
                        <strong>Channels:</strong>{' '}
                        {rule.notification_channels?.map((ch: string) => (
                          <span key={ch} className="inline-block mr-2 capitalize">
                            {ch === 'in_app' ? 'In-App' : ch}
                          </span>
                        ))}
                      </div>
                      {rule.zone_id && <div className="text-muted-foreground">Zone-specific rule</div>}
                      {rule.property_id && <div className="text-muted-foreground">Property-specific rule</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

