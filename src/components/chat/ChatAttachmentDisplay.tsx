import { useState } from 'react';
import { FileText, Music, Download, ExternalLink, X, File, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { UploadedAttachment, formatFileSize, getFileCategory } from '@/hooks/useChatAttachments';
import { cn } from '@/lib/utils';

interface ChatAttachmentDisplayProps {
  attachments: UploadedAttachment[];
  isOwn: boolean;
}

export function ChatAttachmentDisplay({ attachments, isOwn }: ChatAttachmentDisplayProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const renderAttachment = (attachment: UploadedAttachment) => {
    const category = getFileCategory(attachment.file_type);

    switch (category) {
      case 'image':
        return (
          <button
            key={attachment.id}
            onClick={() => setExpandedImage(attachment.url)}
            className="group relative cursor-pointer overflow-hidden rounded-lg"
          >
            <img
              src={attachment.url}
              alt={attachment.file_name}
              className="max-h-48 max-w-full rounded-lg object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
              <ExternalLink className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        );

      case 'audio':
        return (
          <div
            key={attachment.id}
            className={cn(
              'flex flex-col gap-2 rounded-lg p-2',
              isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {attachment.file_name}
              </span>
            </div>
            <audio controls className="h-8 w-full max-w-[280px]" preload="metadata">
              <source src={attachment.url} type={attachment.file_type} />
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      case 'video':
        return (
          <div
            key={attachment.id}
            className={cn(
              'flex flex-col gap-2 rounded-lg overflow-hidden',
              isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
            )}
          >
            <video
              controls
              className="max-h-64 max-w-full rounded-lg"
              preload="metadata"
            >
              <source src={attachment.url} type={attachment.file_type} />
              Your browser does not support video playback.
            </video>
            <div className="flex items-center gap-2 px-2 pb-2">
              <Video className="h-4 w-4 text-blue-500" />
              <span className="text-xs truncate">{attachment.file_name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(attachment.file_size)})
              </span>
            </div>
          </div>
        );

      case 'pdf':
      case 'document':
        return (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 rounded-lg p-3 transition-colors',
              isOwn
                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                : 'bg-background/50 hover:bg-background/80'
            )}
          >
            <FileText
              className={cn(
                'h-8 w-8 shrink-0',
                category === 'pdf' ? 'text-red-500' : 'text-blue-500'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        );

      default:
        return (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 rounded-lg p-3 transition-colors',
              isOwn
                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                : 'bg-background/50 hover:bg-background/80'
            )}
          >
            <File className="h-8 w-8 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        );
    }
  };

  return (
    <>
      <div className="mt-2 flex flex-col gap-2">
        {attachments.map(renderAttachment)}
      </div>

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <VisuallyHidden>
            <DialogTitle>Expanded Image</DialogTitle>
          </VisuallyHidden>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Expanded view"
                className="max-h-[80vh] w-auto mx-auto rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
