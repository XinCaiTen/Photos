export interface ImageItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  imageIds: string[];
  createdAt: string;
}

export type SortOption = 'newest' | 'oldest' | 'month';

/** 'all' | 'favorites' | albumId */
export type View = string;

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
