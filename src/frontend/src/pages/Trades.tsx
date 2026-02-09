import { useState } from 'react';
import { useGetAllTrades, useGetAllModels, useDeleteTrade, useUpdateTrade } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Eye, Pencil, Trash2, X, Target } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import TradeForm from '../components/TradeForm';
import TradeDetailDialog from '../components/TradeDetailDialog';
import TradeOutcomeEditor from '../components/trade/TradeOutcomeEditor';
import SetupIdentifier from '../components/SetupIdentifier';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { Trade, ModelCondition } from '../backend';
import { computeTradePLFromOutcomes, computeTradeRRFromOutcomes, isTradeWinner } from '../utils/trade/tradeMetrics';

export default function Trades() {
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const { data: models = [], isLoading: modelsLoading } = useGetAllModels();
  const deleteTrade = useDeleteTrade();
  const updateTrade = useUpdateTrade();

  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [outcomeTrade, setOutcomeTrade] = useState<Trade | null>(null);
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

  const handleOpenOutcome = (trade: Trade) => {
    setOutcomeTrade(trade);
  };

  const handleCloseOutcome = () => {
    setOutcomeTrade(null);
  };

  const handleSaveOutcome = async (updatedTrade: Trade) => {
    try {
      await updateTrade.mutateAsync(updatedTrade);
      toast.success('Trade outcome saved successfully!');
      handleCloseOutcome();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save trade outcome');
      console.error(error);
    }
  };

  // Helper function to determine trade status
  const getTradeStatus = (trade: Trade): { label: string; variant: 'default' | 'destructive' | 'secondary'; isOpen: boolean } => {
    // Check if trade has outcomes
    const hasOutcome = trade.is_completed && trade.bracket_order_outcomes && trade.bracket_order_outcomes.length > 0;
    
    if (!hasOutcome) {
      return { label: 'Open', variant: 'secondary', isOpen: true };
    }
    
    const isWin = isTradeWinner(trade);
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
        const aRR = getTradeStatus(a).isOpen ? 0 : computeTradeRRFromOutcomes(a);
        const bRR = getTradeStatus(b).isOpen ? 0 : computeTradeRRFromOutcomes(b);
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

  // If outcome editor is showing, render full-page outcome editor
  if (outcomeTrade) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-4 sm:p-6 max-w-full overflow-x-hidden">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Trade Outcome</h1>
              <p className="text-sm sm:text-base text-muted-foreground break-words">
                Record the outcome for {outcomeTrade.asset} {outcomeTrade.direction.toUpperCase()}
              </p>
            </div>
            <Button variant="outline" onClick={handleCloseOutcome} className="gap-2 shrink-0 w-full sm:w-auto">
              <X className="w-4 h-4" />
              Back to Journal
            </Button>
          </div>
          
          <TradeOutcomeEditor
            trade={outcomeTrade}
            onSave={handleSaveOutcome}
            onCancel={handleCloseOutcome}
            isSaving={updateTrade.isPending}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // If form is showing, render only the form inline
  if (showForm) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-4 sm:p-6 max-w-full overflow-x-hidden">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {editingTrade ? 'Edit Trade' : 'Log Trade'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {editingTrade ? 'Update trade details' : 'Record a new trade'}
              </p>
            </div>
            <Button variant="outline" onClick={handleCloseForm} className="gap-2 shrink-0 w-full sm:w-auto">
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
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Trade Journal</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Track and analyze your trading performance</p>
          </div>
          <Button onClick={handleOpenNewTradeForm} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Log Trade
          </Button>
        </div>

        {/* Setup Identifier */}
        <SetupIdentifier onSelectModel={handleSelectModelFromIdentifier} />

        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <Select value={filterModel} onValueChange={setFilterModel}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Models" />
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
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Assets" />
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
            <SelectTrigger className="w-full sm:w-[200px]">
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
              <Button onClick={handleOpenNewTradeForm}>
                <Plus className="w-4 h-4 mr-2" />
                Log Your First Trade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTrades.map((trade) => {
              const model = models.find((m) => m.id === trade.model_id);
              const status = getTradeStatus(trade);
              const tradePL = status.isOpen ? 0 : computeTradePLFromOutcomes(trade);
              const tradeRR = status.isOpen ? 0 : computeTradeRRFromOutcomes(trade);

              return (
                <Card key={trade.id} className="w-full">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg sm:text-xl break-words">{trade.asset}</CardTitle>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <CardDescription className="break-words">
                          {model?.name || 'Unknown Model'} •{' '}
                          {format(new Date(Number(trade.created_at) / 1000000), 'PPP')}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenOutcome(trade)}
                          title="Trade Outcome"
                        >
                          <Target className="w-4 h-4" />
                        </Button>
                        {!status.isOpen && (
                          <Button variant="outline" size="sm" onClick={() => setViewingTrade(trade)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(trade)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(trade.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Entry</p>
                        <p className="font-semibold break-words">${trade.bracket_order.entry_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position Size</p>
                        <p className="font-semibold break-words">{trade.bracket_order.position_size.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">R:R</p>
                        <p className="font-semibold break-words">
                          {status.isOpen ? '-' : `${tradeRR.toFixed(2)}R`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">P/L</p>
                        <p
                          className={`font-semibold break-words ${
                            status.isOpen
                              ? ''
                              : tradePL > 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {status.isOpen ? '-' : `$${tradePL.toFixed(2)}`}
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
