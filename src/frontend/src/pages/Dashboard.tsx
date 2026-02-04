import { useGetAllModels, useGetAllTrades } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Trade } from '../backend';

interface DashboardProps {
  onNavigate: (page: 'models' | 'trades') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();

  const isLoading = modelsLoading || tradesLoading;

  // Calculate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;
  const losingTrades = trades.filter((t) => t.bracket_order_outcome.final_pl_usd < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPL = trades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const avgRR = trades.length > 0 ? trades.reduce((sum, t) => sum + t.bracket_order_outcome.rr, 0) / trades.length : 0;

  const grossProfit = trades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.bracket_order_outcome.final_pl_usd < 0).reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Calculate equity curve
  const equityCurve = trades
    .sort((a, b) => Number(a.created_at - b.created_at))
    .reduce((acc: { date: string; equity: number }[], trade, index) => {
      const prevEquity = index > 0 ? acc[index - 1].equity : 10000;
      const newEquity = prevEquity + trade.bracket_order_outcome.final_pl_usd;
      acc.push({
        date: new Date(Number(trade.created_at) / 1000000).toLocaleDateString(),
        equity: newEquity,
      });
      return acc;
    }, []);

  // Recent trades (last 5)
  const recentTrades = [...trades]
    .sort((a, b) => Number(b.created_at - a.created_at))
    .slice(0, 5);

  // Top performing models
  const modelPerformance = models.map((model) => {
    const modelTrades = trades.filter((t) => t.model_id === model.id);
    const modelPL = modelTrades.reduce((sum, t) => sum + t.bracket_order_outcome.final_pl_usd, 0);
    const modelWins = modelTrades.filter((t) => t.bracket_order_outcome.final_pl_usd > 0).length;
    const modelWinRate = modelTrades.length > 0 ? (modelWins / modelTrades.length) * 100 : 0;
    return {
      model,
      pl: modelPL,
      winRate: modelWinRate,
      trades: modelTrades.length,
    };
  });

  const topModels = modelPerformance.sort((a, b) => b.pl - a.pl).slice(0, 3);

  if (isLoading) {
    return (
      <div className="container py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your trading performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('models')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Model
          </Button>
          <Button onClick={() => onNavigate('trades')} className="gap-2">
            <Plus className="w-4 h-4" />
            Log Trade
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${totalPL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{totalTrades} total trades</p>
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

      {/* Equity Curve */}
      {equityCurve.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Your account balance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Your latest trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trades logged yet</p>
                <Button variant="link" onClick={() => onNavigate('trades')} className="mt-2">
                  Log your first trade
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          trade.direction === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        {trade.direction === 'long' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{trade.asset}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(trade.created_at) / 1000000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${trade.bracket_order_outcome.final_pl_usd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${trade.bracket_order_outcome.final_pl_usd.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{trade.bracket_order_outcome.rr.toFixed(2)}R</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Models */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Models</CardTitle>
            <CardDescription>Your most profitable trading models</CardDescription>
          </CardHeader>
          <CardContent>
            {topModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No models created yet</p>
                <Button variant="link" onClick={() => onNavigate('models')} className="mt-2">
                  Create your first model
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topModels.map((item, index) => (
                  <div key={item.model.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.model.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.trades} trades • {item.winRate.toFixed(0)}% WR
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${item.pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${item.pl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
