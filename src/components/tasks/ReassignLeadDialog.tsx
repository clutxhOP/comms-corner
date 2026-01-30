import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBusinesses, Business } from '@/hooks/useBusinesses';
import { Loader2 } from 'lucide-react';

interface ReassignLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { businessId: string; whatsapp?: string; reason?: string }) => void;
  leadTitle?: string;
}

export function ReassignLeadDialog({
  open,
  onOpenChange,
  onConfirm,
  leadTitle,
}: ReassignLeadDialogProps) {
  const { allBusinesses, loading: businessesLoading } = useBusinesses();
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedBusiness) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        businessId: selectedBusiness,
        whatsapp: whatsapp.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      // Reset form
      setSelectedBusiness('');
      setWhatsapp('');
      setReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedBusiness('');
    setWhatsapp('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
          <DialogDescription>
            {leadTitle
              ? `Reassign "${leadTitle}" to a different business.`
              : 'Select a business to reassign this lead to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="business">Select Business *</Label>
            {businessesLoading ? (
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading businesses...
              </div>
            ) : (
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger id="business">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {allBusinesses.map((business: Business) => (
                    <SelectItem key={business.id} value={business.id}>
                      <div className="flex flex-col">
                        <span>{business.name || 'Unnamed Business'}</span>
                        {business.category && (
                          <span className="text-xs text-muted-foreground">
                            {business.category}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="whatsapp">New WhatsApp Number (optional)</Label>
            <Input
              id="whatsapp"
              placeholder="e.g., +1234567890"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Reassignment (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this lead is being reassigned..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBusiness || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
