'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { MarketAlertsFeed } from '@/components/alerts/MarketAlertsFeed';
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';
import { SavedSearches } from '@/components/alerts/SavedSearches';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMarketConfig } from '@/config/market';
import type { AlertRule } from '@/types/database';

// i18n translations based on market locale
const translations = {
  es: {
    title: 'Alertas y Busquedas',
    subtitle: 'Gestiona tus busquedas guardadas y alertas de mercado en tiempo real (tipo Waze)',
    marketAlertsTab: 'Market Alerts',
    rulesTab: 'Mis Reglas',
    searchesTab: 'Busquedas Guardadas',
    marketAlertsTitle: 'Alertas de Mercado en Tiempo Real',
    marketAlertsDesc: 'Recibe notificaciones instantaneas cuando cambien las condiciones del mercado',
    preferences: 'Preferencias',
    newRule: 'Nueva Regla',
    noRulesYet: 'No tienes reglas de alerta aun',
    createFirstRule: 'Crear Tu Primera Regla',
    rule: 'Regla',
    channels: 'Canales',
    inApp: 'En App',
    active: 'Activa',
    inactive: 'Inactiva',
    delete: 'Eliminar',
    deleteConfirm: 'Eliminar esta regla de alerta?',
    zoneSpecific: 'Regla especifica de zona',
    propertySpecific: 'Regla especifica de propiedad',
    loading: 'Cargando...',
  },
  en: {
    title: 'Alerts & Searches',
    subtitle: 'Manage your saved searches and real-time market alerts (Waze-style)',
    marketAlertsTab: 'Market Alerts',
    rulesTab: 'My Rules',
    searchesTab: 'Saved Searches',
    marketAlertsTitle: 'Real-Time Market Alerts',
    marketAlertsDesc: 'Get notified instantly when market conditions change',
    preferences: 'Preferences',
    newRule: 'New Rule',
    noRulesYet: 'No alert rules yet',
    createFirstRule: 'Create Your First Rule',
    rule: 'Rule',
    channels: 'Channels',
    inApp: 'In-App',
    active: 'Active',
    inactive: 'Inactive',
    delete: 'Delete',
    deleteConfirm: 'Delete this alert rule?',
    zoneSpecific: 'Zone-specific rule',
    propertySpecific: 'Property-specific rule',
    loading: 'Loading...',
  },
};

// Get locale from market config
function getLocale(): 'es' | 'en' {
  const market = getMarketConfig();
  const locale = market.currency.locale;
  // Spanish locales: es-DO, es-MX, es-ES, es-CO
  if (locale.startsWith('es')) return 'es';
  return 'en';
}

export default function AlertsPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [showBuilder, setShowBuilder] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Get translations based on market locale
  const t = translations[getLocale()];

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
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.subtitle}
        </p>
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
      <Tabs defaultValue="market-alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="market-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t.marketAlertsTab}
            {rules.filter((r: AlertRule) => r.active).length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({rules.filter((r: AlertRule) => r.active).length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">
            {t.rulesTab}
            {rules.length > 0 && <span className="ml-2 text-xs text-muted-foreground">({rules.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="searches">{t.searchesTab}</TabsTrigger>
        </TabsList>

        {/* Market Alerts Tab - Waze-style feed */}
        <TabsContent value="market-alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t.marketAlertsTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {t.marketAlertsDesc}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t.preferences}
              </Button>
              <Button onClick={() => setShowBuilder(!showBuilder)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.newRule}
              </Button>
            </div>
          </div>
          <MarketAlertsFeed userId={userId} maxItems={50} />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{t.noRulesYet}</p>
                <Button onClick={() => setShowBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.createFirstRule}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule: AlertRule) => (
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
                          {rule.active ? t.active : t.inactive}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm(t.deleteConfirm)) {
                              const response = await fetch(`/api/alert-rules?id=${rule.id}`, {
                                method: 'DELETE',
                              });
                              if (response.ok) refetchRules();
                            }
                          }}
                        >
                          {t.delete}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>{t.rule}:</strong>{' '}
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(rule.rule, null, 2)}
                        </code>
                      </div>
                      <div>
                        <strong>{t.channels}:</strong>{' '}
                        {rule.notification_channels?.map((ch: string) => (
                          <span key={ch} className="inline-block mr-2 capitalize">
                            {ch === 'in_app' ? t.inApp : ch}
                          </span>
                        ))}
                      </div>
                      {rule.zone_id && <div className="text-muted-foreground">{t.zoneSpecific}</div>}
                      {rule.property_id && <div className="text-muted-foreground">{t.propertySpecific}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Saved Searches Tab */}
        <TabsContent value="searches" className="space-y-4">
          <SavedSearches />
        </TabsContent>
      </Tabs>
    </div>
  );
}
