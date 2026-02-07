import { useState } from 'react';
import { useGetAllTrades, useGetAllModels, useDeleteTrade } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Eye, Pencil, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import TradeForm from '../components/TradeForm';
import TradeDetailDialog from '../components/TradeDetailDialog';
import SetupIdentifier from '../components/SetupIdentifier';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { Trade, ModelCondition } from '../backend';

export default function Trades() {
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const deleteTrade = useDeleteTrade();

  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rr'>('date');
  
  // Setup identifier state
  const [preloadedModelId, setPreloadedModelId] = useState<string | null>(null);
  const [preloadedObservations, setPreloadedObservations] = useState<ModelCondition[]>([]);

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setPreloadedModelId(null);
    setPreloadedObservations([]);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      try {
        await deleteTrade.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete trade:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTrade(null);
    setPreloadedModelId(null);
    setPreloadedObservations([]);
  };

  const handleOpenNewTradeForm = () => {
    setEditingTrade(null);
    setPreloadedModelId(null);
    setPreloadedObservations([]);
    setShowForm(true);
  };

  const handleSelectModelFromIdentifier = (modelId: string, observations: ModelCondition[]) => {
    setEditingTrade(null);
    setPreloadedModelId(modelId);
    setPreloadedObservations(observations);
    setShowForm(true);
  };

  // Helper function to determine trade status
  const getTradeStatus = (trade: Trade): { label: string; variant: 'default' | 'destructive' | 'secondary'; isOpen: boolean } => {
    // Check if trade has a defined outcome
    const hasOutcome = trade.is_completed && 
                       trade.bracket_order_outcome && 
                       trade.bracket_order_outcome.filled_bracket_groups && 
                       trade.bracket_order_outcome.filled_bracket_groups.length > 0;
    
    if (!hasOutcome) {
      return { label: 'Open', variant: 'secondary', isOpen: true };
    }
    
    const isWin = trade.bracket_order_outcome.final_pl_usd > 0;
    return { 
      label: isWin ? 'Win' : 'Loss', 
      variant: isWin ? 'default' : 'destructive',
      isOpen: false
    };
  };

  // Get unique assets
  const uniqueAssets = Array.from(new Set(trades.map((t) => t.asset)));

  // Filter and sort trades
  const filteredTrades = trades
    .filter((trade) => {
      if (filterModel !== 'all' && trade.model_id !== filterModel) return false;
      if (filterAsset !== 'all' && trade.asset !== filterAsset) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return Number(b.created_at) - Number(a.created_at);
      } else {
        // For open trades, use 0 for R:R comparison
        const aRR = getTradeStatus(a).isOpen ? 0 : a.bracket_order_outcome.rr;
        const bRR = getTradeStatus(b).isOpen ? 0 : b.bracket_order_outcome.rr;
        return bRR - aRR;
      }
    });

  if (tradesLoading || modelsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading trades...</p>
          </div>
        </div>
      </div>
    );
  }

  // If form is showing, render only the form inline
  if (showForm) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {editingTrade ? 'Edit Trade' : 'Log Trade'}
              </h1>
              <p className="text-muted-foreground">
                {editingTrade ? 'Update trade details' : 'Record a new trade'}
              </p>
            </div>
            <Button variant="outline" onClick={handleCloseForm} className="gap-2">
              <X className="w-4 h-4" />
              Back to Journal
            </Button>
          </div>
          
          <TradeForm 
            trade={editingTrade} 
            models={models} 
            onClose={handleCloseForm}
            preloadedModelId={preloadedModelId}
            preloadedObservations={preloadedObservations}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trade Journal</h1>
            <p className="text-muted-foreground">Track and analyze your trading performance</p>
          </div>
          <Button onClick={handleOpenNewTradeForm} className="gap-2">
            <Plus className="w-4 h-4" />
            Log Trade
          </Button>
        </div>

        {/* Setup Identifier */}
        <SetupIdentifier onSelectModel={handleSelectModelFromIdentifier} />

        <div className="flex gap-4 flex-wrap">
          <Select value={filterModel} onValueChange={setFilterModel}>
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

          <Select value={filterAsset} onValueChange={setFilterAsset}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {uniqueAssets.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'rr')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date (Newest)</SelectItem>
              <SelectItem value="rr">R:R (Highest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTrades.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No trades found</p>
              <Button onClick={handleOpenNewTradeForm} className="gap-2">
                <Plus className="w-4 h-4" />
                Log Your First Trade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTrades.map((trade) => {
              const model = models.find((m) => m.id === trade.model_id);
              const status = getTradeStatus(trade);

              return (
                <Card key={trade.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {trade.direction === 'long' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          {trade.asset}
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {model?.name} • {format(new Date(Number(trade.created_at) / 1000000), 'PPP')}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setViewingTrade(trade)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(trade)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(trade.id)}
                          disabled={deleteTrade.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Entry</p>
                        <p className="font-medium">{trade.bracket_order.entry_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Size</p>
                        <p className="font-medium">{trade.bracket_order.position_size}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">R:R</p>
                        <p className="font-medium">
                          {status.isOpen ? '-' : `${trade.bracket_order_outcome.rr.toFixed(2)}R`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">P/L</p>
                        <p className={`font-medium ${
                          status.isOpen 
                            ? 'text-muted-foreground' 
                            : trade.bracket_order_outcome.final_pl_usd > 0 
                              ? 'text-green-500' 
                              : 'text-red-500'
                        }`}>
                          {status.isOpen ? '-' : `$${trade.bracket_order_outcome.final_pl_usd.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {viewingTrade && (
          <TradeDetailDialog 
            trade={viewingTrade} 
            open={!!viewingTrade} 
            onClose={() => setViewingTrade(null)} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
