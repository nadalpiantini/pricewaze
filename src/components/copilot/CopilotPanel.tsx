'use client';

import { useState } from 'react';
import type { CopilotAnalysis } from '@/types/copilot';
import { Loader2, Bot, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CopilotPanelProps {
  offerId: string;
  className?: string;
}

export function CopilotPanel({ offerId, className = '' }: CopilotPanelProps) {
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeNegotiation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/copilot/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze negotiation');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return level;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Copiloto de negociación
            </CardTitle>
            <CardDescription>
              Análisis contextual basado en señales del mercado y historial de ofertas
            </CardDescription>
          </div>
          <Button
            onClick={analyzeNegotiation}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Analizar negociación
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Resumen</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Confidence Level */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Nivel de confianza:</span>
              <Badge className={getConfidenceColor(analysis.confidence_level)}>
                {getConfidenceLabel(analysis.confidence_level)}
              </Badge>
            </div>

            {/* Key Factors */}
            {analysis.key_factors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Factores clave</h4>
                <ul className="space-y-1">
                  {analysis.key_factors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {analysis.risks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Riesgos
                </h4>
                <ul className="space-y-1">
                  {analysis.risks.map((risk, idx) => (
                    <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scenarios */}
            {analysis.scenarios.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3">Escenarios comparativos</h4>
                <div className="space-y-3">
                  {analysis.scenarios.map((scenario, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-sm mb-1">{scenario.option}</div>
                      <p className="text-xs text-gray-600 mb-2">{scenario.rationale}</p>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {scenario.pros.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Pros
                            </div>
                            <ul className="space-y-0.5">
                              {scenario.pros.map((pro, pIdx) => (
                                <li key={pIdx} className="text-xs text-green-600">
                                  • {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {scenario.cons.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Contras
                            </div>
                            <ul className="space-y-0.5">
                              {scenario.cons.map((con, cIdx) => (
                                <li key={cIdx} className="text-xs text-red-600">
                                  • {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.scenarios.length === 0 && analysis.key_factors.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                Datos insuficientes para generar escenarios comparativos.
              </div>
            )}
          </div>
        )}

        {!analysis && !loading && !error && (
          <div className="text-sm text-gray-500 text-center py-8">
            Haz clic en "Analizar negociación" para obtener un análisis contextual basado en
            señales del mercado y el historial de ofertas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

