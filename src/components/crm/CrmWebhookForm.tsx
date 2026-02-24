import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CRM_WEBHOOK_EVENTS } from '@/hooks/useCrmWebhooks';
import { RefreshCw } from 'lucide-react';

interface CrmWebhookFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; url: string; events: string[]; secret?: string }) => Promise<boolean>;
}

export function CrmWebhookForm({ open, onOpenChange, onSubmit }: CrmWebhookFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const generateSecret = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    setSecret(Array.from(arr, b => b.toString(16).padStart(2, '0')).join(''));
  };

  const toggleEvent = (value: string) => {
    setSelectedEvents(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return;
    setSubmitting(true);
    const ok = await onSubmit({ name: name.trim(), url: url.trim(), events: selectedEvents, secret: secret || undefined });
    setSubmitting(false);
    if (ok) {
      setName('');
      setUrl('');
      setSecret('');
      setSelectedEvents([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add CRM Webhook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="wh-name">Name</Label>
            <Input id="wh-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CRM Lead Sync" />
          </div>
          <div>
            <Label htmlFor="wh-url">URL</Label>
            <Input id="wh-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <Label htmlFor="wh-secret">Secret (optional)</Label>
            <div className="flex gap-2">
              <Input id="wh-secret" value={secret} onChange={e => setSecret(e.target.value)} placeholder="HMAC signing secret" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={generateSecret} title="Auto-generate">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Events</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {CRM_WEBHOOK_EVENTS.map(ev => (
                <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedEvents.includes(ev.value)} onCheckedChange={() => toggleEvent(ev.value)} />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim() || !url.trim() || selectedEvents.length === 0}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
