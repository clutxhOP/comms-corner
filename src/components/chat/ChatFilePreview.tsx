import { X, FileText, Music, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileAttachment, formatFileSize, getFileCategory } from '@/hooks/useChatAttachments';
import { cn } from '@/lib/utils';

interface ChatFilePreviewProps {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
}

export function ChatFilePreview({ attachments, onRemove }: ChatFilePreviewProps) {
  if (attachments.length === 0) return null;

  const getFileIcon = (type: string) => {
    const category = getFileCategory(type);
    switch (category) {
      case 'pdf':
      case 'document':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-purple-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="border-t bg-muted/30 p-3">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              'relative flex items-center gap-2 rounded-lg border bg-card p-2 pr-8',
              attachment.status === 'error' && 'border-destructive bg-destructive/10'
            )}
          >
            {/* Preview or Icon */}
            {attachment.preview ? (
              <img
                src={attachment.preview}
                alt={attachment.name}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                {getFileIcon(attachment.type)}
              </div>
            )}

            {/* File Info */}
            <div className="min-w-0 max-w-[150px]">
              <p className="truncate text-sm font-medium">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              {attachment.status === 'uploading' && (
                <Progress value={attachment.progress} className="mt-1 h-1" />
              )}
              {attachment.status === 'error' && (
                <p className="text-xs text-destructive">Upload failed</p>
              )}
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-5 w-5 rounded-full hover:bg-destructive/20"
              onClick={() => onRemove(attachment.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
