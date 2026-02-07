import { useGetAllModels, useGetAllTrades } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Target, Award, CheckCircle2, Activity, Zap, Clock, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';
import { filterTrades, getCompletedTrades, type Session } from '../utils/analytics/tradeScope';
import { computeEquityCurve, computeMaxDrawdown } from '../utils/analytics/equityCurve';
import { computeMetrics } from '../utils/analytics/metrics';
import { computeSessionMetrics } from '../utils/analytics/sessionAnalytics';
import { computeAdherenceComparison } from '../utils/analytics/adherence';
import { computeBracketMetrics } from '../utils/analytics/brackets';
import { computeBiasMetrics } from '../utils/analytics/htfBias';
import { binRValues } from '../utils/analytics/distributions';
import { computeHourBuckets, computeWeekdayBuckets } from '../utils/analytics/timeBuckets';
import { computeToolImpact } from '../utils/analytics/toolImpact';
import { computeVolatilityMetrics } from '../utils/analytics/volatility';
import { runMonteCarloSimulation } from '../utils/analytics/monteCarlo';

export default function Analytics() {
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<Session>('All');
  const [adherenceFilterEnabled, setAdherenceFilterEnabled] = useState(false);
  const [adherenceThreshold, setAdherenceThreshold] = useState(80);

  const isLoading = modelsLoading || tradesLoading;

  // Unified filtered trade set
  const filteredTrades = useMemo(() => {
    return filterTrades(trades, {
      modelId: selectedModel,
      session: selectedSession,
      adherenceThreshold: adherenceFilterEnabled ? adherenceThreshold / 100 : undefined,
    });
  }, [trades, selectedModel, selectedSession, adherenceFilterEnabled, adherenceThreshold]);

  // Compute all analytics from filtered trades
  const metrics = useMemo(() => computeMetrics(filteredTrades), [filteredTrades]);
  const equityCurve = useMemo(() => computeEquityCurve(filteredTrades), [filteredTrades]);
  const maxDrawdown = useMemo(() => computeMaxDrawdown(equityCurve), [equityCurve]);
  const sessionMetrics = useMemo(() => computeSessionMetrics(filteredTrades), [filteredTrades]);
  const adherenceComparison = useMemo(() => 
    computeAdherenceComparison(filteredTrades, adherenceThreshold / 100),
    [filteredTrades, adherenceThreshold]
  );
  const bracketMetrics = useMemo(() => computeBracketMetrics(filteredTrades), [filteredTrades]);
  const biasMetrics = useMemo(() => computeBiasMetrics(filteredTrades, models), [filteredTrades, models]);
  const hourBuckets = useMemo(() => computeHourBuckets(filteredTrades), [filteredTrades]);
  const weekdayBuckets = useMemo(() => computeWeekdayBuckets(filteredTrades), [filteredTrades]);
  const toolImpact = useMemo(() => computeToolImpact(filteredTrades, models), [filteredTrades, models]);
  const volatilityMetrics = useMemo(() => computeVolatilityMetrics(filteredTrades), [filteredTrades]);
  const monteCarloResult = useMemo(() => runMonteCarloSimulation(filteredTrades), [filteredTrades]);

  if (isLoading) {
    return (
      <div className="container py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">Comprehensive performance insights and metrics</p>
        </div>

        {/* Unified Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 space-y-2">
            <Label>Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label>Session</Label>
            <Select value={selectedSession} onValueChange={(v) => setSelectedSession(v as Session)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sessions</SelectItem>
                <SelectItem value="Asia">Asia (00:00-08:00 UTC)</SelectItem>
                <SelectItem value="London">London (08:00-16:00 UTC)</SelectItem>
                <SelectItem value="NY">NY (16:00-24:00 UTC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={adherenceFilterEnabled}
                onCheckedChange={setAdherenceFilterEnabled}
                id="adherence-filter"
              />
              <Label htmlFor="adherence-filter" className="text-sm">
                Only include trades with adherence ≥ {adherenceThreshold}%
              </Label>
            </div>
            {adherenceFilterEnabled && (
              <Input
                type="number"
                min="0"
                max="100"
                value={adherenceThreshold}
                onChange={(e) => setAdherenceThreshold(Number(e.target.value))}
                className="w-full md:w-[120px]"
              />
            )}
          </div>
        </div>
      </div>

      {metrics.totalTrades === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {adherenceFilterEnabled 
                ? `No trades found with adherence ≥ ${adherenceThreshold}%. Try adjusting your filters.`
                : 'Start logging trades to see your performance analytics'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
            <TabsTrigger value="brackets">Brackets</TabsTrigger>
            <TabsTrigger value="bias">HTF Bias</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${metrics.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${metrics.totalPL.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">{metrics.totalTrades} trades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalWins}W / {metrics.totalLosses}L
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Gross profit / loss</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgR.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Risk-reward ratio</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Average Win vs Loss</CardTitle>
                  <CardDescription>Comparison of average winning and losing trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Average Win</p>
                      <p className="text-3xl font-bold text-green-500">${metrics.avgWin.toFixed(2)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Average Loss</p>
                      <p className="text-3xl font-bold text-red-500">${metrics.avgLoss.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Max Drawdown</CardTitle>
                  <CardDescription>Largest peak-to-trough decline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-red-500">${maxDrawdown.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Based on equity curve</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Equity Curve Tab */}
          <TabsContent value="equity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
                <CardDescription>
                  {selectedModel === 'all' ? 'All models' : models.find(m => m.id === selectedModel)?.name || 'Selected model'}
                  {' - '}Cumulative P/L over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {equityCurve.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No completed trades</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="index" label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area type="monotone" dataKey="equity" stroke="hsl(var(--chart-1))" fill="url(#equityGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total P/L</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${metrics.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${metrics.totalPL.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-500">${maxDrawdown.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Performance</CardTitle>
                <CardDescription>Win rate, P/L, and average R by trading session</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sessionMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="session" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                    <Bar yAxisId="right" dataKey="totalPL" fill="hsl(var(--chart-2))" name="Total P/L ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {sessionMetrics.map((session) => (
                <Card key={session.session}>
                  <CardHeader>
                    <CardTitle className="text-lg">{session.session}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Trades</span>
                      <span className="font-medium">{session.trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-medium">{session.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total P/L</span>
                      <span className={`font-medium ${session.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${session.totalPL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg R</span>
                      <span className="font-medium">{session.avgR.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Adherence Tab */}
          <TabsContent value="adherence" className="space-y-6">
            {adherenceFilterEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Adherence Filter Comparison</CardTitle>
                  <CardDescription>
                    Comparing trades with adherence ≥ {adherenceThreshold}% vs all trades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Filtered (≥{adherenceThreshold}%)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Trades</span>
                          <span className="font-medium">{adherenceComparison.filteredTrades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Win Rate</span>
                          <span className="font-medium">{adherenceComparison.filteredWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total P/L</span>
                          <span className={`font-medium ${adherenceComparison.filteredPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${adherenceComparison.filteredPL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">All Trades</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Trades</span>
                          <span className="font-medium">{adherenceComparison.allTrades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Win Rate</span>
                          <span className="font-medium">{adherenceComparison.allWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total P/L</span>
                          <span className={`font-medium ${adherenceComparison.allPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${adherenceComparison.allPL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Difference</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Win Rate Delta</span>
                        <span className={`font-medium ${adherenceComparison.winRateDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {adherenceComparison.winRateDelta >= 0 ? '+' : ''}{adherenceComparison.winRateDelta.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">P/L Delta</span>
                        <span className={`font-medium ${adherenceComparison.plDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {adherenceComparison.plDelta >= 0 ? '+' : ''}${adherenceComparison.plDelta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Brackets Tab */}
          <TabsContent value="brackets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bracket-Level Analytics</CardTitle>
                <CardDescription>TP/SL hit rates and realized R by bracket index</CardDescription>
              </CardHeader>
              <CardContent>
                {bracketMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No bracket data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={bracketMetrics}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bracketIndex" label={{ value: 'Bracket #', position: 'insideBottom', offset: -5 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="tpHitRate" fill="hsl(var(--chart-1))" name="TP Hit Rate (%)" />
                      <Bar dataKey="slHitRate" fill="hsl(var(--chart-5))" name="SL Hit Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bracketMetrics.map((bracket) => (
                <Card key={bracket.bracketIndex}>
                  <CardHeader>
                    <CardTitle className="text-lg">Bracket {bracket.bracketIndex}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Hits</span>
                      <span className="font-medium">{bracket.totalHits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">TP Hit Rate</span>
                      <span className="font-medium text-green-500">{bracket.tpHitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">SL Hit Rate</span>
                      <span className="font-medium text-red-500">{bracket.slHitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Realized R</span>
                      <span className="font-medium">{bracket.avgRealizedR.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HTF Bias Tab */}
          <TabsContent value="bias" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>HTF Bias Performance</CardTitle>
                <CardDescription>Win rate and P/L by higher timeframe bias</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={biasMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="bias" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                    <Bar yAxisId="right" dataKey="totalPL" fill="hsl(var(--chart-2))" name="Total P/L ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {biasMetrics.map((bias) => (
                <Card key={bias.bias}>
                  <CardHeader>
                    <CardTitle className="text-lg">{bias.bias}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Trades</span>
                      <span className="font-medium">{bias.trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-medium">{bias.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total P/L</span>
                      <span className={`font-medium ${bias.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${bias.totalPL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg R</span>
                      <span className="font-medium">{bias.avgR.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {biasMetrics.some(b => b.rValues.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>R Distribution by Bias</CardTitle>
                  <CardDescription>Distribution of realized R values</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={binRValues(biasMetrics.flatMap(b => b.rValues), 8)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bin" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Trade Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Time Tab */}
          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Time-of-Day Performance</CardTitle>
                <CardDescription>Win rate and P/L by hour (UTC)</CardDescription>
              </CardHeader>
              <CardContent>
                {hourBuckets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hourly data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={hourBuckets}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day-of-Week Performance</CardTitle>
                <CardDescription>Win rate and P/L by weekday</CardDescription>
              </CardHeader>
              <CardContent>
                {weekdayBuckets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No weekday data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={weekdayBuckets}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="weekday" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                      <Bar yAxisId="right" dataKey="totalPL" fill="hsl(var(--chart-2))" name="Total P/L ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Impactful Tools</CardTitle>
                <CardDescription>Ranked by correlation with trade outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {toolImpact.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Insufficient data for tool impact analysis (minimum 3 trades per tool required)
                  </div>
                ) : (
                  <div className="space-y-4">
                    {toolImpact.slice(0, 10).map((tool, index) => (
                      <div key={tool.toolId} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tool.toolName}</p>
                          <p className="text-sm text-muted-foreground">
                            {tool.zone} • {tool.sampleSize} trades
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tool.impactScore >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tool.impactScore >= 0 ? '+' : ''}{tool.impactScore.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Impact Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Volatility-Environment Performance</CardTitle>
                <CardDescription>Performance by volatility bucket (based on stop-loss distance)</CardDescription>
              </CardHeader>
              <CardContent>
                {volatilityMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No volatility data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={volatilityMetrics}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                      <Bar yAxisId="right" dataKey="totalPL" fill="hsl(var(--chart-2))" name="Total P/L ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {volatilityMetrics.map((vol) => (
                <Card key={vol.bucket}>
                  <CardHeader>
                    <CardTitle className="text-lg">{vol.bucket} Volatility</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Trades</span>
                      <span className="font-medium">{vol.trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-medium">{vol.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total P/L</span>
                      <span className={`font-medium ${vol.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${vol.totalPL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg R</span>
                      <span className="font-medium">{vol.avgR.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monte Carlo Simulation</CardTitle>
                <CardDescription>Projected equity paths based on your R distribution (100 runs, 200 trades each)</CardDescription>
              </CardHeader>
              <CardContent>
                {!monteCarloResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Insufficient data for Monte Carlo simulation (minimum 5 completed trades required)
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="index" 
                          type="number" 
                          domain={[0, 200]} 
                          label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} 
                        />
                        <YAxis label={{ value: 'Cumulative R', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line 
                          data={monteCarloResult.minPath.map((r, i) => ({ index: i, r }))} 
                          type="monotone" 
                          dataKey="r" 
                          stroke="hsl(var(--chart-5))" 
                          strokeWidth={2} 
                          name="Min Path" 
                          dot={false}
                        />
                        <Line 
                          data={monteCarloResult.avgPath.map((r, i) => ({ index: i, r }))} 
                          type="monotone" 
                          dataKey="r" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={3} 
                          name="Avg Path" 
                          dot={false}
                        />
                        <Line 
                          data={monteCarloResult.maxPath.map((r, i) => ({ index: i, r }))} 
                          type="monotone" 
                          dataKey="r" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={2} 
                          name="Max Path" 
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="grid gap-4 md:grid-cols-3 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Min Projected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-red-500">{monteCarloResult.minEquity.toFixed(2)}R</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Avg Projected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{monteCarloResult.avgEquity.toFixed(2)}R</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Max Projected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-500">{monteCarloResult.maxEquity.toFixed(2)}R</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
