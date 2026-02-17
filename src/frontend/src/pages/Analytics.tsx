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
import { aggregateTradesByDay, getMonthCalendarGrid } from '../utils/trade/tradeCalendar';
import TradeCalendarMonth from '../components/trade-calendar/TradeCalendarMonth';
import TradeDayDrilldownDialog from '../components/trade-calendar/TradeDayDrilldownDialog';
import type { CalendarDay, DayAggregates } from '../utils/trade/tradeCalendar';

export default function Analytics() {
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<Session>('All');
  const [adherenceFilterEnabled, setAdherenceFilterEnabled] = useState(false);
  const [adherenceThreshold, setAdherenceThreshold] = useState(80);

  // Calendar state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayAggregates | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

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

  // Calendar data
  const dayAggregates = useMemo(() => aggregateTradesByDay(trades), [trades]);
  const calendarDays = useMemo(
    () => getMonthCalendarGrid(calendarYear, calendarMonth, dayAggregates),
    [calendarYear, calendarMonth, dayAggregates]
  );

  // Transform bracket metrics for chart display
  const bracketChartData = useMemo(() => 
    bracketMetrics.map(b => ({
      bracket: `Bracket ${b.bracketIndex + 1}`,
      tpHitRate: b.tpHitRate,
      slHitRate: b.slHitRate,
      avgRealizedR: b.avgRealizedR,
    })),
    [bracketMetrics]
  );

  const handleDayClick = (day: CalendarDay) => {
    if (day.aggregates && day.aggregates.tradeCount > 0) {
      setSelectedDay(day.aggregates);
      setDrilldownOpen(true);
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

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
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
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

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Trade Calendar
                </CardTitle>
                <CardDescription>
                  Daily aggregated performance metrics. Click a day to view detailed trade information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TradeCalendarMonth
                  year={calendarYear}
                  month={calendarMonth}
                  calendarDays={calendarDays}
                  onDayClick={handleDayClick}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Adherence Impact</CardTitle>
                <CardDescription>
                  Comparing trades with adherence ≥ {adherenceThreshold}% vs all trades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">High Adherence (≥{adherenceThreshold}%)</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Trades</span>
                          <Badge variant="outline">{adherenceComparison.filteredTrades}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Win Rate</span>
                          <span className="font-bold">{adherenceComparison.filteredWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total P/L</span>
                          <span className={`font-bold ${adherenceComparison.filteredPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${adherenceComparison.filteredPL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">All Trades</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Trades</span>
                          <Badge variant="outline">{adherenceComparison.allTrades}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Win Rate</span>
                          <span className="font-bold">{adherenceComparison.allWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total P/L</span>
                          <span className={`font-bold ${adherenceComparison.allPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${adherenceComparison.allPL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm font-medium mb-4">Impact Delta</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Win Rate Difference</span>
                      <span className={`font-bold ${adherenceComparison.winRateDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {adherenceComparison.winRateDelta >= 0 ? '+' : ''}{adherenceComparison.winRateDelta.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">P/L Difference</span>
                      <span className={`font-bold ${adherenceComparison.plDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {adherenceComparison.plDelta >= 0 ? '+' : ''}${adherenceComparison.plDelta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brackets Tab */}
          <TabsContent value="brackets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bracket Performance</CardTitle>
                <CardDescription>Hit rates and realized R by bracket level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={bracketChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="bracket" />
                    <YAxis yAxisId="left" label={{ value: 'Hit Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg R', angle: 90, position: 'insideRight' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="tpHitRate" fill="hsl(var(--chart-1))" name="TP Hit Rate (%)" />
                    <Bar yAxisId="left" dataKey="slHitRate" fill="hsl(var(--chart-3))" name="SL Hit Rate (%)" />
                    <Bar yAxisId="right" dataKey="avgRealizedR" fill="hsl(var(--chart-2))" name="Avg Realized R" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {bracketMetrics.map((bracket) => (
                <Card key={bracket.bracketIndex}>
                  <CardHeader>
                    <CardTitle className="text-lg">Bracket {bracket.bracketIndex + 1}</CardTitle>
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
          </TabsContent>

          {/* Time Tab */}
          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hour of Day Performance</CardTitle>
                <CardDescription>Win rate by hour (UTC)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={hourBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" label={{ value: 'Hour (UTC)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="winRate" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day of Week Performance</CardTitle>
                <CardDescription>Win rate by weekday</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={weekdayBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" />
                    <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="winRate" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tool Impact Rankings</CardTitle>
                <CardDescription>Performance impact by tool type and zone</CardDescription>
              </CardHeader>
              <CardContent>
                {toolImpact.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tool data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {toolImpact.map((tool, index) => (
                      <div
                        key={`${tool.toolId}-${tool.zone}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{tool.toolName}</p>
                            <p className="text-sm text-muted-foreground">
                              {tool.zone} • {tool.sampleSize} trades
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{tool.winRate.toFixed(1)}%</p>
                          <p className={`text-sm ${tool.avgPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${tool.avgPL.toFixed(2)} avg
                          </p>
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
                <CardTitle>Volatility Environment Performance</CardTitle>
                <CardDescription>Win rate and P/L by market volatility</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={volatilityMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="environment" />
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

            <Card>
              <CardHeader>
                <CardTitle>Monte Carlo Simulation</CardTitle>
                <CardDescription>
                  1000 simulations based on your empirical R distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monteCarloResult.minPath.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Not enough data for simulation
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={monteCarloResult.minPath.map((_, i) => ({
                        trade: i,
                        min: monteCarloResult.minPath[i],
                        avg: monteCarloResult.avgPath[i],
                        max: monteCarloResult.maxPath[i],
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="trade" label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="min" stroke="hsl(var(--chart-3))" strokeWidth={1} dot={false} name="Worst Case" />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Average" />
                      <Line type="monotone" dataKey="max" stroke="hsl(var(--chart-2))" strokeWidth={1} dot={false} name="Best Case" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Drilldown Dialog */}
      <TradeDayDrilldownDialog
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        dayAggregates={selectedDay}
      />
    </div>
  );
}
