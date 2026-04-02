import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Trade } from '../backend';
import { useUpdateTrade } from '../hooks/useQueries';
import TradeOutcomeEditor from './trade/TradeOutcomeEditor';

interface TradeDetailDialogProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
}

export default function TradeDetailDialog({ trade, open, onClose }: TradeDetailDialogProps) {
  const updateTrade = useUpdateTrade();

  if (!trade) return null;

  const handleSave = async (updatedTrade: Trade) => {
    try {
      await updateTrade.mutateAsync(updatedTrade);
      toast.success('Trade outcome saved successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save trade outcome');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Trade Outcome</DialogTitle>
          <DialogDescription>
            Record the outcome of your trade and reflect on the results
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <TradeOutcomeEditor
            trade={trade}
            onSave={handleSave}
            onCancel={onClose}
            isSaving={updateTrade.isPending}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
