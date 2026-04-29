import type { ImageItem } from './types';

const BASE_URL = (import.meta.env.VITE_WORKER_URL as string) || '';

export async function fetchImages(): Promise<ImageItem[]> {
  const res = await fetch(`${BASE_URL}/images`);
  if (!res.ok) throw new Error('Không thể tải danh sách ảnh');
  return res.json();
}

export function uploadImage(
  file: File,
  onProgress: (pct: number) => void
): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as ImageItem);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Upload thất bại'));
        } catch {
          reject(new Error(`Upload thất bại (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối mạng'));
    xhr.send(formData);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/images/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Không thể xoá ảnh');
}

/** Download qua Worker proxy để tránh CORS của R2 */
export async function downloadImageById(id: string, name: string): Promise<void> {
  const url = `${BASE_URL}/download/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download thất bại');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
