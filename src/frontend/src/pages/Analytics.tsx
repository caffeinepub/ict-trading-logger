import { useGetAllModels, useGetAllTrades, useGetAdherenceAnalytics } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function Analytics() {
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const { data: adherenceData, isLoading: adherenceLoading } = useGetAdherenceAnalytics();
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const isLoading = modelsLoading || tradesLoading;

  const filteredTrades = selectedModel === 'all' ? trades : trades.filter((t) => t.model_id === selectedModel);

  // Calculate metrics
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;
  const losingTrades = filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPL = filteredTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const avgWin = winningTrades > 0 ? filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0) / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? Math.abs(filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd < 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0) / losingTrades) : 0;
  const avgRR = totalTrades > 0 ? filteredTrades.reduce((sum, t) => sum + t.bracket_order_outcome.rr, 0) / totalTrades : 0;

  const grossProfit = filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const grossLoss = Math.abs(filteredTrades.filter((t) => t.bracket_order_outcome.final_pl_usd < 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Adherence metrics
  const avgAdherence = totalTrades > 0 ? filteredTrades.reduce((sum, t) => sum + (t.adherence_score || 0), 0) / totalTrades : 0;
  const highAdherenceTrades = filteredTrades.filter(t => (t.adherence_score || 0) >= 0.8);
  const lowAdherenceTrades = filteredTrades.filter(t => (t.adherence_score || 0) < 0.8);
  const highAdherenceWinRate = highAdherenceTrades.length > 0 
    ? (highAdherenceTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length / highAdherenceTrades.length) * 100 
    : 0;
  const lowAdherenceWinRate = lowAdherenceTrades.length > 0 
    ? (lowAdherenceTrades.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length / lowAdherenceTrades.length) * 100 
    : 0;

  // Adherence distribution
  const adherenceRanges = [
    { range: '0-20%', min: 0, max: 0.2 },
    { range: '20-40%', min: 0.2, max: 0.4 },
    { range: '40-60%', min: 0.4, max: 0.6 },
    { range: '60-80%', min: 0.6, max: 0.8 },
    { range: '80-100%', min: 0.8, max: 1.0 },
  ];

  const adherenceDistribution = adherenceRanges.map(({ range, min, max }) => {
    const tradesInRange = filteredTrades.filter(t => {
      const score = t.adherence_score || 0;
      return score >= min && score <= max;
    });
    const wins = tradesInRange.filter(t => t.bracket_order_outcome.final_pl_usd > 0).length;
    const winRate = tradesInRange.length > 0 ? (wins / tradesInRange.length) * 100 : 0;
    
    return {
      range,
      trades: tradesInRange.length,
      winRate,
      avgPL: tradesInRange.length > 0 
        ? tradesInRange.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0) / tradesInRange.length 
        : 0,
    };
  });

  // Adherence vs Performance scatter
  const adherenceScatter = filteredTrades.map(t => ({
    adherence: (t.adherence_score || 0) * 100,
    pl: t.bracket_order_outcome.final_pl_usd,
    isWin: t.bracket_order_outcome.final_pl_usd > 0,
  }));

  // Win/Loss distribution
  const winLossData = [
    { name: 'Wins', value: winningTrades, color: 'hsl(var(--chart-1))' },
    { name: 'Losses', value: losingTrades, color: 'hsl(var(--chart-5))' },
  ];

  // Monthly performance
  const monthlyData = filteredTrades.reduce((acc: any[], trade) => {
    const date = new Date(Number(trade.created_at) / 1000000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = acc.find((item) => item.month === monthKey);
    if (existing) {
      existing.pl += trade.bracket_order_outcome.final_pl_usd;
      existing.trades += 1;
    } else {
      acc.push({ month: monthKey, pl: trade.bracket_order_outcome.final_pl_usd, trades: 1 });
    }
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  // Model comparison
  const modelComparison = models.map((model) => {
    const modelTrades = trades.filter((t) => t.model_id === model.id);
    const modelWins = modelTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;
    const modelPL = modelTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    const modelAvgAdherence = modelTrades.length > 0 
      ? modelTrades.reduce((sum, t) => sum + (t.adherence_score || 0), 0) / modelTrades.length 
      : 0;
    
    return {
      name: model.name.length > 15 ? model.name.slice(0, 15) + '...' : model.name,
      trades: modelTrades.length,
      winRate: modelTrades.length > 0 ? (modelWins / modelTrades.length) * 100 : 0,
      pl: modelPL,
      adherence: modelAvgAdherence * 100,
    };
  }).filter((m) => m.trades > 0);

  // Direction analysis
  const longTrades = filteredTrades.filter((t) => t.direction === 'long');
  const shortTrades = filteredTrades.filter((t) => t.direction === 'short');
  const longWins = longTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;
  const shortWins = shortTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;

  const directionData = [
    {
      direction: 'Long',
      trades: longTrades.length,
      winRate: longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0,
      pl: longTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0),
    },
    {
      direction: 'Short',
      trades: shortTrades.length,
      winRate: shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0,
      pl: shortTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0),
    },
  ];

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Comprehensive performance insights and metrics</p>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[200px]">
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

      {totalTrades === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Start logging trades to see your performance analytics
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${totalPL.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">{totalTrades} trades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {winningTrades}W / {losingTrades}L
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
                    {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${grossProfit.toFixed(0)} / ${grossLoss.toFixed(0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgRR.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Risk-reward ratio</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Win/Loss Distribution</CardTitle>
                  <CardDescription>Breakdown of winning vs losing trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Direction Analysis</CardTitle>
                  <CardDescription>Performance by trade direction</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={directionData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="direction" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Average Win vs Loss</CardTitle>
                <CardDescription>Comparison of average winning and losing trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Win</p>
                    <p className="text-3xl font-bold text-green-500">${avgWin.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Loss</p>
                    <p className="text-3xl font-bold text-red-500">${avgLoss.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adherence" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Adherence</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(avgAdherence * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Model compliance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Adherence</CardTitle>
                  <Badge variant="default" className="text-xs">≥80%</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{highAdherenceWinRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Win rate ({highAdherenceTrades.length} trades)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Adherence</CardTitle>
                  <Badge variant="secondary" className="text-xs">&lt;80%</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lowAdherenceWinRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Win rate ({lowAdherenceTrades.length} trades)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Adherence Impact</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${highAdherenceWinRate - lowAdherenceWinRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(highAdherenceWinRate - lowAdherenceWinRate).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Win rate difference</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Adherence Distribution</CardTitle>
                <CardDescription>Win rate and trade count by adherence score ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={adherenceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" />
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
                    <Bar yAxisId="left" dataKey="trades" fill="hsl(var(--chart-2))" name="Trade Count" />
                    <Bar yAxisId="right" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adherence vs Performance</CardTitle>
                <CardDescription>Scatter plot showing relationship between model adherence and P/L</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="adherence" name="Adherence %" />
                    <YAxis dataKey="pl" name="P/L ($)" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Scatter 
                      name="Winning Trades" 
                      data={adherenceScatter.filter(d => d.isWin)} 
                      fill="hsl(var(--chart-1))" 
                    />
                    <Scatter 
                      name="Losing Trades" 
                      data={adherenceScatter.filter(d => !d.isWin)} 
                      fill="hsl(var(--chart-5))" 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Comparison</CardTitle>
                <CardDescription>Compare performance across different trading models</CardDescription>
              </CardHeader>
              <CardContent>
                {modelComparison.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No model data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={modelComparison}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="pl" fill="hsl(var(--chart-1))" name="P/L ($)" />
                      <Bar dataKey="winRate" fill="hsl(var(--chart-2))" name="Win Rate (%)" />
                      <Bar dataKey="adherence" fill="hsl(var(--chart-3))" name="Avg Adherence (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modelComparison.map((model) => (
                <Card key={model.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-medium">{model.trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-medium">{model.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Adherence</span>
                      <span className="font-medium">{model.adherence.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total P/L</span>
                      <span className={`font-medium ${model.pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${model.pl.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Track your P/L over time</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No monthly data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="pl" stroke="hsl(var(--chart-1))" strokeWidth={2} name="P/L ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
