import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  storagePath?: string;
}

export interface UploadedAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  pdf: ['application/pdf'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg'],
  document: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat();

export function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimeType)) return category;
  }
  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function useChatAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not supported`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit`;
    }
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: FileAttachment[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: 'Invalid file',
          description: `${file.name}: ${error}`,
          variant: 'destructive',
        });
        continue;
      }

      const attachment: FileAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        progress: 0,
        status: 'pending',
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const clearAttachments = () => {
    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setAttachments([]);
  };

  const uploadAttachments = async (messageId: string): Promise<UploadedAttachment[]> => {
    if (!user || attachments.length === 0) return [];

    setIsUploading(true);
    const uploaded: UploadedAttachment[] = [];

    try {
      for (const attachment of attachments) {
        // Update status to uploading
        setAttachments((prev) =>
          prev.map((a) => (a.id === attachment.id ? { ...a, status: 'uploading' as const } : a))
        );

        const fileExt = attachment.name.split('.').pop();
        const fileName = `${user.id}/${messageId}/${attachment.id}.${fileExt}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, attachment.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setAttachments((prev) =>
            prev.map((a) => (a.id === attachment.id ? { ...a, status: 'error' as const } : a))
          );
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${attachment.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(uploadData.path);

        // Save metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('chat_attachments')
          .insert({
            message_id: messageId,
            user_id: user.id,
            file_name: attachment.name,
            file_type: attachment.type,
            file_size: attachment.size,
            storage_path: uploadData.path,
            url: urlData.publicUrl,
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB error:', dbError);
          setAttachments((prev) =>
            prev.map((a) => (a.id === attachment.id ? { ...a, status: 'error' as const } : a))
          );
          continue;
        }

        // Update status to completed
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? { ...a, status: 'completed' as const, progress: 100, url: urlData.publicUrl }
              : a
          )
        );

        uploaded.push({
          id: dbData.id,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: uploadData.path,
          url: urlData.publicUrl,
        });
      }

      return uploaded;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'An error occurred while uploading files',
        variant: 'destructive',
      });
      return uploaded;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    attachments,
    isUploading,
    addFiles,
    removeAttachment,
    clearAttachments,
    uploadAttachments,
    validateFile,
  };
}

// Fetch attachments for messages
export async function fetchMessageAttachments(messageIds: string[]): Promise<Record<string, UploadedAttachment[]>> {
  if (messageIds.length === 0) return {};

  const { data, error } = await supabase
    .from('chat_attachments')
    .select('*')
    .in('message_id', messageIds);

  if (error) {
    console.error('Error fetching attachments:', error);
    return {};
  }

  const grouped: Record<string, UploadedAttachment[]> = {};
  for (const attachment of data || []) {
    if (!grouped[attachment.message_id]) {
      grouped[attachment.message_id] = [];
    }
    grouped[attachment.message_id].push({
      id: attachment.id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      storage_path: attachment.storage_path,
      url: attachment.url,
    });
  }

  return grouped;
}
