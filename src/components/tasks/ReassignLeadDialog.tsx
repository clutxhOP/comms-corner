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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBusinesses, Business } from '@/hooks/useBusinesses';
import { Loader2, Search } from 'lucide-react';

interface ReassignLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { businessIds: string[]; whatsapp?: string; reason?: string }) => void;
  leadTitle?: string;
}

export function ReassignLeadDialog({
  open,
  onOpenChange,
  onConfirm,
  leadTitle,
}: ReassignLeadDialogProps) {
  const { allBusinesses, loading: businessesLoading } = useBusinesses();
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBusinesses = allBusinesses.filter((business: Business) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (business.name?.toLowerCase().includes(query)) ||
      (business.category?.toLowerCase().includes(query)) ||
      (business.whatsapp?.includes(query))
    );
  });

  const handleToggleBusiness = (businessId: string) => {
    setSelectedBusinessIds((prev) =>
      prev.includes(businessId)
        ? prev.filter((id) => id !== businessId)
        : [...prev, businessId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBusinessIds.length === filteredBusinesses.length) {
      setSelectedBusinessIds([]);
    } else {
      setSelectedBusinessIds(filteredBusinesses.map((b: Business) => b.id));
    }
  };

  const handleConfirm = async () => {
    if (selectedBusinessIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        businessIds: selectedBusinessIds,
        whatsapp: whatsapp.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      // Reset form
      setSelectedBusinessIds([]);
      setWhatsapp('');
      setReason('');
      setSearchQuery('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedBusinessIds([]);
    setWhatsapp('');
    setReason('');
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
          <DialogDescription>
            {leadTitle
              ? `Reassign "${leadTitle}" to one or more businesses.`
              : 'Select businesses to reassign this lead to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Select Businesses *</Label>
              <span className="text-xs text-muted-foreground">
                {selectedBusinessIds.length} selected
              </span>
            </div>

            {businessesLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading businesses...
              </div>
            ) : (
              <div className="border rounded-md">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search businesses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                
                <div className="p-2 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredBusinesses.length > 0 &&
                        selectedBusinessIds.length === filteredBusinesses.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-xs cursor-pointer">
                      Select All ({filteredBusinesses.length})
                    </Label>
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-1">
                    {filteredBusinesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No businesses found
                      </p>
                    ) : (
                      filteredBusinesses.map((business: Business) => (
                        <div
                          key={business.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleBusiness(business.id)}
                        >
                          <Checkbox
                            checked={selectedBusinessIds.includes(business.id)}
                            onCheckedChange={() => handleToggleBusiness(business.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {business.name || 'Unnamed Business'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {business.category && (
                                <span className="truncate">{business.category}</span>
                              )}
                              {business.whatsapp && (
                                <>
                                  {business.category && <span>•</span>}
                                  <span>{business.whatsapp}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
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
            disabled={selectedBusinessIds.length === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : (
              `Reassign to ${selectedBusinessIds.length} Business${selectedBusinessIds.length !== 1 ? 'es' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
