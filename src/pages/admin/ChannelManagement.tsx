import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, Copy, Check, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  allowed_roles: string[];
  created_at: string;
}

function ChannelCard({ channel }: { channel: Channel }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const copyToClipboard = (text: string, type: 'id' | 'slug') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive border-destructive/20',
    dev: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    ops: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{channel.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">/{channel.slug}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {channel.description && (
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20">Channel ID:</span>
            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">
              {channel.id}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => copyToClipboard(channel.id, 'id')}
            >
              {copiedId ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20">Slug:</span>
            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono">
              {channel.slug}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => copyToClipboard(channel.slug, 'slug')}
            >
              {copiedSlug ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Access:</span>
          <div className="flex flex-wrap gap-1">
            {channel.allowed_roles.map((role) => (
              <Badge key={role} variant="outline" className={`text-xs ${roleColors[role] || ''}`}>
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChannelManagement() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load channels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Hash className="h-6 w-6" />
            Chat Channels
          </h1>
          <p className="text-muted-foreground mt-1">
            View available chat channels and their IDs for API integration
          </p>
        </div>

        {/* API Endpoint Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Send Message API</CardTitle>
            <CardDescription>
              Use this endpoint to send messages to channels from external sources (webhooks, automations)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/20">POST</Badge>
                <code className="text-sm font-mono">{BASE_URL}/send-channel-message</code>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`// Request Body
{
  "channelId": "main",  // or use full UUID
  "message": "Hello from automation!",
  "sender": "Daily Report Bot"
}

// Response
{
  "success": true,
  "messageId": "generated-uuid",
  "channelId": "channel-uuid",
  "sender": "Daily Report Bot"
}`}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 No authentication required. Use channel slug (main, dev, ops) or the full channel ID.
            </p>
          </CardContent>
        </Card>

        {/* Channels List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Channels</h2>
          
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : channels.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No channels found
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
