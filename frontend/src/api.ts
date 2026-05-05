import type { ImageItem, Album } from './types';

const BASE_URL = (import.meta.env.VITE_WORKER_URL as string) || 'https://photostack-worker.duannguyen0901.workers.dev';

// ── Images ───────────────────────────────────────────────────────

export async function fetchImages(): Promise<ImageItem[]> {
  const res = await fetch(`${BASE_URL}/images`);
  if (!res.ok) throw new Error('Không thể tải danh sách ảnh');
  return res.json();
}

// Generate a resized JPEG thumbnail using Canvas
async function generateThumbnail(file: File, maxSize = 400): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null;
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
    img.src = objectUrl;
  });
}

export function uploadImage(file: File, onProgress: (pct: number) => void): Promise<ImageItem> {
  return new Promise(async (resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    // Generate + attach thumbnail (non-blocking if it fails)
    try {
      const thumb = await generateThumbnail(file);
      if (thumb && thumb.size < file.size) {
        formData.append('thumbnail', new File([thumb], 'thumb.jpg', { type: 'image/jpeg' }));
      }
    } catch { /* thumbnail optional — continue without it */ }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as ImageItem);
      } else {
        try { reject(new Error((JSON.parse(xhr.responseText) as { error: string }).error || 'Upload thất bại')); }
        catch { reject(new Error(`Upload thất bại (${xhr.status})`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Lỗi kết nối mạng'));
    xhr.send(formData);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/images/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Không thể xoá ảnh');
}

export async function renameImage(id: string, newName: string): Promise<ImageItem> {
  const res = await fetch(`${BASE_URL}/images/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) throw new Error('Không thể đổi tên ảnh');
  return res.json();
}

export async function downloadImageById(id: string, name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/download/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Download thất bại');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ── Favorites ────────────────────────────────────────────────────

export async function fetchFavorites(): Promise<{ ids: string[] }> {
  const res = await fetch(`${BASE_URL}/favorites`);
  if (!res.ok) throw new Error('Không thể tải favorites');
  return res.json();
}

export async function addFavorite(imageId: string): Promise<void> {
  await fetch(`${BASE_URL}/favorites/${encodeURIComponent(imageId)}`, { method: 'POST' });
}

export async function removeFavorite(imageId: string): Promise<void> {
  await fetch(`${BASE_URL}/favorites/${encodeURIComponent(imageId)}`, { method: 'DELETE' });
}

// ── Albums ───────────────────────────────────────────────────────

export async function fetchAlbums(): Promise<Album[]> {
  const res = await fetch(`${BASE_URL}/albums`);
  if (!res.ok) throw new Error('Không thể tải albums');
  return res.json();
}

export async function createAlbum(name: string): Promise<Album> {
  const res = await fetch(`${BASE_URL}/albums`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Không thể tạo album');
  return res.json();
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await fetch(`${BASE_URL}/albums/${albumId}`, { method: 'DELETE' });
}

export async function updateAlbum(
  albumId: string,
  payload: { name?: string; addImageIds?: string[]; removeImageIds?: string[] }
): Promise<Album> {
  const res = await fetch(`${BASE_URL}/albums/${albumId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể cập nhật album');
  return res.json();
}
