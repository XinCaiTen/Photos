export interface ImageItem {
  id: string;
  url: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: ImageItem;
}

export type Theme = 'dark' | 'light';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
