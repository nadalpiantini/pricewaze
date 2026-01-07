'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { ruleTemplates } from '@/lib/alerts/evaluateRule';
import { useToast } from '@/hooks/use-toast';

interface AlertRuleBuilderProps {
  zoneId?: string;
  propertyId?: string;
  onSave?: () => void;
}

export function AlertRuleBuilder({ zoneId, propertyId, onSave }: AlertRuleBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const templates = [
    { id: 'priceDrop', name: 'Price Drop', rule: ruleTemplates.priceDrop },
    { id: 'inventorySpike', name: 'Inventory Spike', rule: ruleTemplates.inventorySpike },
    { id: 'trendChange', name: 'Trend Change', rule: ruleTemplates.trendChange },
    { id: 'zonePriceIncrease', name: 'Zone Price Increase', rule: ruleTemplates.zonePriceIncrease },
  ];

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      if (!name) {
        setName(template.name);
      }
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your alert rule',
        variant: 'destructive',
      });
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) {
      toast({
        title: 'Template required',
        description: 'Please select a rule template',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          zone_id: zoneId || null,
          property_id: propertyId || null,
          rule: template.rule,
          notification_channels: channels,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create alert rule');
      }

      toast({
        title: 'Alert rule created',
        description: 'Your alert rule has been saved and is now active',
      });

      // Reset form
      setName('');
      setDescription('');
      setSelectedTemplate('');
      setChannels(['in_app']);

      onSave?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create alert rule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Alert Rule</CardTitle>
        <CardDescription>
          Set up alerts to be notified when market conditions change
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rule Name */}
        <div className="space-y-2">
          <Label htmlFor="rule-name">Rule Name *</Label>
          <Input
            id="rule-name"
            placeholder="e.g., Price Drop in Naco"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="rule-description">Description (optional)</Label>
          <Textarea
            id="rule-description"
            placeholder="Describe what this alert monitors..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Alert Type *</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select an alert type" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <strong>Rule:</strong>{' '}
              <code className="text-xs">
                {JSON.stringify(templates.find((t) => t.id === selectedTemplate)?.rule, null, 2)}
              </code>
            </div>
          )}
        </div>

        {/* Notification Channels */}
        <div className="space-y-3">
          <Label>Notification Channels</Label>
          <div className="space-y-2">
            {['in_app', 'email', 'push'].map((channel) => (
              <div key={channel} className="flex items-center justify-between">
                <Label htmlFor={`channel-${channel}`} className="font-normal capitalize">
                  {channel === 'in_app' ? 'In-App' : channel}
                </Label>
                <Switch
                  id={`channel-${channel}`}
                  checked={channels.includes(channel)}
                  onCheckedChange={() => toggleChannel(channel)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={loading || !name || !selectedTemplate} className="w-full">
          {loading ? 'Creating...' : 'Create Alert Rule'}
        </Button>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Alert rules are evaluated every 15 minutes. You'll receive notifications when market
            signals match your rule conditions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

