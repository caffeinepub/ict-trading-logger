import { ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGetModel, useGetTradesByModel } from '../hooks/useQueries';
import { computeMetrics } from '../utils/analytics/metrics';
import { computeEquityCurve, computeMaxDrawdown } from '../utils/analytics/equityCurve';
import ModelNotecard from '../components/model/ModelNotecard';
import ExternalBlobImage from '../components/model/ExternalBlobImage';

interface ModelViewerProps {
  modelId: string;
  onBack: () => void;
}

export default function ModelViewer({ modelId, onBack }: ModelViewerProps) {
  const { data: model, isLoading: modelLoading, error: modelError } = useGetModel(modelId);
  const { data: trades = [], isLoading: tradesLoading } = useGetTradesByModel(modelId);

  if (modelLoading || tradesLoading) {
    return (
      <div className="container py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading model details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (modelError || !model) {
    return (
      <div className="container py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-2xl font-bold">Model Not Found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            The model you're looking for could not be loaded. It may have been deleted or you may not have permission to view it.
          </p>
          <Button onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Models
          </Button>
        </div>
      </div>
    );
  }

  const completedTrades = trades.filter(t => t.is_completed);
  const metrics = computeMetrics(completedTrades);
  const equityCurve = computeEquityCurve(completedTrades);
  const maxDrawdown = computeMaxDrawdown(equityCurve);

  return (
    <div className="container py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{model.name}</h1>
          <p className="text-muted-foreground">Model performance and trade history</p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-6 pr-4">
          {/* Model Notecard Overview */}
          <ModelNotecard model={model} />

          {/* Example Setups */}
          {model.example_images && model.example_images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Example Setups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {model.example_images.map((example) => (
                    <div key={example.id} className="space-y-2">
                      <ExternalBlobImage
                        blob={example.blob}
                        alt={example.description}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <p className="text-sm text-muted-foreground">{example.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {completedTrades.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No completed trades yet for this model. Start logging trades to see performance metrics.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Total P/L</span>
                    </div>
                    <p className={`text-2xl font-bold ${metrics.totalPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${metrics.totalPL.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm">Total Trades</span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalTrades}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Win Rate</span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {metrics.totalWins}W / {metrics.totalLosses}L
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Profit Factor</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm">Avg R</span>
                    </div>
                    <p className={`text-2xl font-bold ${metrics.avgR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {metrics.avgR.toFixed(2)}R
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Avg Win</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${metrics.avgWin.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm">Avg Loss</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ${metrics.avgLoss.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm">Max Drawdown</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ${maxDrawdown.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle>Trade Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {completedTrades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No completed trades to display. Trades will appear here once you log outcomes.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {completedTrades.map((trade) => (
                    <div key={trade.id} className="space-y-3 pb-6 border-b last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {trade.direction.toUpperCase()} {trade.asset}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(Number(trade.created_at) / 1000000).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${trade.bracket_order_outcomes.reduce((sum, o) => sum + (o.closure_price - o.execution_price) * o.size, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.bracket_order_outcomes.reduce((sum, o) => sum + (o.closure_price - o.execution_price) * o.size, 0) >= 0 ? '+' : ''}
                            ${trade.bracket_order_outcomes.reduce((sum, o) => sum + (o.closure_price - o.execution_price) * o.size, 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {trade.notes && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{trade.notes}</p>
                        </div>
                      )}

                      {trade.images && trade.images.length > 0 && (
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {trade.images.map((image, idx) => (
                            <ExternalBlobImage
                              key={idx}
                              blob={image}
                              alt={`Trade screenshot ${idx + 1}`}
                              className="w-full h-32 object-cover rounded border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
