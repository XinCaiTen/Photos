/* ─── Cloudflare Worker – PhotoStack API ──────────────────────── */

export interface Env {
  BUCKET: R2Bucket;
  PUBLIC_URL: string;
  ALLOWED_ORIGINS: string;
}

interface ImageMeta {
  id: string; url: string; name: string; size: number; createdAt: string;
}
interface Metadata { images: ImageMeta[]; }
interface FavoritesData { ids: string[]; }
interface Album { id: string; name: string; imageIds: string[]; createdAt: string; }
interface AlbumsData { albums: Album[]; }

const METADATA_KEY  = 'metadata.json';
const FAVORITES_KEY = 'favorites.json';
const ALBUMS_KEY    = 'albums.json';
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);

// ─── Helpers ─────────────────────────────────────────────────────

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin  = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '*');
  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
    Vary: 'Origin',
  };
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function randomId(len = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function readJson<T>(bucket: R2Bucket, key: string, fallback: T): Promise<T> {
  const obj = await bucket.get(key);
  if (!obj) return fallback;
  try { return (await obj.json()) as T; } catch { return fallback; }
}

async function writeJson(bucket: R2Bucket, key: string, data: unknown): Promise<void> {
  await bucket.put(key, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' },
  });
}

// ─── Main Handler ────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const { pathname } = url;

    try {

      /* ── GET /images ─────────────────────────────────────── */
      if (request.method === 'GET' && pathname === '/images') {
        const meta = await readJson<Metadata>(env.BUCKET, METADATA_KEY, { images: [] });
        return json(meta.images, 200, cors);
      }

      /* ── PATCH /images/:id — rename ──────────────────────── */
      if (request.method === 'PATCH' && pathname.startsWith('/images/')) {
        const id = decodeURIComponent(pathname.slice('/images/'.length));
        if (!id) return json({ error: 'Missing id' }, 400, cors);
        const body = await request.json() as { name?: string };
        const newName = body.name?.trim();
        if (!newName) return json({ error: 'name is required' }, 400, cors);
        const meta = await readJson<Metadata>(env.BUCKET, METADATA_KEY, { images: [] });
        const idx = meta.images.findIndex(img => img.id === id);
        if (idx === -1) return json({ error: 'Image not found' }, 404, cors);
        meta.images[idx].name = newName;
        await writeJson(env.BUCKET, METADATA_KEY, meta);
        return json(meta.images[idx], 200, cors);
      }

      /* ── POST /upload ────────────────────────────────────── */
      if (request.method === 'POST' && pathname === '/upload') {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data'))
          return json({ error: 'Expected multipart/form-data' }, 400, cors);

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) return json({ error: 'No file provided' }, 400, cors);
        if (!ALLOWED_TYPES.has(file.type))
          return json({ error: 'Loại file không được phép. Chỉ chấp nhận JPG, PNG, WEBP, GIF.' }, 400, cors);

        const key = `images/${Date.now()}_${randomId()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await env.BUCKET.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
        });

        const imageMeta: ImageMeta = {
          id: key, url: `${env.PUBLIC_URL}/${key}`,
          name: file.name, size: file.size, createdAt: new Date().toISOString(),
        };
        const meta = await readJson<Metadata>(env.BUCKET, METADATA_KEY, { images: [] });
        meta.images.unshift(imageMeta);
        await writeJson(env.BUCKET, METADATA_KEY, meta);
        return json(imageMeta, 201, cors);
      }

      /* ── GET /download/:id ───────────────────────────────── */
      if (request.method === 'GET' && pathname.startsWith('/download/')) {
        const id = decodeURIComponent(pathname.slice('/download/'.length));
        if (!id) return json({ error: 'Missing id' }, 400, cors);
        const obj = await env.BUCKET.get(id);
        if (!obj) return json({ error: 'Not found' }, 404, cors);
        const cleanName = (id.split('/').pop() || 'download').replace(/^\d+_[a-z0-9]+_/, '');
        return new Response(obj.body, {
          headers: {
            ...cors,
            'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${cleanName}"`,
            'Cache-Control': 'no-store',
          },
        });
      }

      /* ── DELETE /images/:id ──────────────────────────────── */
      if (request.method === 'DELETE' && pathname.startsWith('/images/')) {
        const id = decodeURIComponent(pathname.slice('/images/'.length));
        if (!id) return json({ error: 'Missing image id' }, 400, cors);
        await env.BUCKET.delete(id);

        const meta = await readJson<Metadata>(env.BUCKET, METADATA_KEY, { images: [] });
        meta.images = meta.images.filter(img => img.id !== id);
        await writeJson(env.BUCKET, METADATA_KEY, meta);

        // Cleanup: remove from favorites & albums
        const favData = await readJson<FavoritesData>(env.BUCKET, FAVORITES_KEY, { ids: [] });
        favData.ids = favData.ids.filter(fid => fid !== id);
        await writeJson(env.BUCKET, FAVORITES_KEY, favData);

        const albumData = await readJson<AlbumsData>(env.BUCKET, ALBUMS_KEY, { albums: [] });
        albumData.albums = albumData.albums.map(a => ({ ...a, imageIds: a.imageIds.filter(iid => iid !== id) }));
        await writeJson(env.BUCKET, ALBUMS_KEY, albumData);

        return json({ success: true }, 200, cors);
      }

      /* ── GET /favorites ──────────────────────────────────── */
      if (request.method === 'GET' && pathname === '/favorites') {
        const data = await readJson<FavoritesData>(env.BUCKET, FAVORITES_KEY, { ids: [] });
        return json(data, 200, cors);
      }

      /* ── POST /favorites/:imageId — add ──────────────────── */
      if (request.method === 'POST' && pathname.startsWith('/favorites/')) {
        const imageId = decodeURIComponent(pathname.slice('/favorites/'.length));
        if (!imageId) return json({ error: 'Missing imageId' }, 400, cors);
        const data = await readJson<FavoritesData>(env.BUCKET, FAVORITES_KEY, { ids: [] });
        if (!data.ids.includes(imageId)) data.ids.push(imageId);
        await writeJson(env.BUCKET, FAVORITES_KEY, data);
        return json(data, 200, cors);
      }

      /* ── DELETE /favorites/:imageId — remove ─────────────── */
      if (request.method === 'DELETE' && pathname.startsWith('/favorites/')) {
        const imageId = decodeURIComponent(pathname.slice('/favorites/'.length));
        if (!imageId) return json({ error: 'Missing imageId' }, 400, cors);
        const data = await readJson<FavoritesData>(env.BUCKET, FAVORITES_KEY, { ids: [] });
        data.ids = data.ids.filter(id => id !== imageId);
        await writeJson(env.BUCKET, FAVORITES_KEY, data);
        return json(data, 200, cors);
      }

      /* ── GET /albums ─────────────────────────────────────── */
      if (request.method === 'GET' && pathname === '/albums') {
        const data = await readJson<AlbumsData>(env.BUCKET, ALBUMS_KEY, { albums: [] });
        return json(data.albums, 200, cors);
      }

      /* ── POST /albums — create ───────────────────────────── */
      if (request.method === 'POST' && pathname === '/albums') {
        const body = await request.json() as { name?: string };
        if (!body.name?.trim()) return json({ error: 'name is required' }, 400, cors);
        const album: Album = {
          id: randomId(12), name: body.name.trim(),
          imageIds: [], createdAt: new Date().toISOString(),
        };
        const data = await readJson<AlbumsData>(env.BUCKET, ALBUMS_KEY, { albums: [] });
        data.albums.push(album);
        await writeJson(env.BUCKET, ALBUMS_KEY, data);
        return json(album, 201, cors);
      }

      /* ── PATCH /albums/:albumId — rename / update images ─── */
      if (request.method === 'PATCH' && pathname.startsWith('/albums/')) {
        const albumId = pathname.slice('/albums/'.length);
        if (!albumId) return json({ error: 'Missing albumId' }, 400, cors);
        const body = await request.json() as { name?: string; addImageIds?: string[]; removeImageIds?: string[] };
        const data = await readJson<AlbumsData>(env.BUCKET, ALBUMS_KEY, { albums: [] });
        const idx = data.albums.findIndex(a => a.id === albumId);
        if (idx === -1) return json({ error: 'Album not found' }, 404, cors);
        if (body.name) data.albums[idx].name = body.name.trim();
        if (body.addImageIds) {
          for (const iid of body.addImageIds)
            if (!data.albums[idx].imageIds.includes(iid)) data.albums[idx].imageIds.push(iid);
        }
        if (body.removeImageIds) {
          data.albums[idx].imageIds = data.albums[idx].imageIds.filter(iid => !body.removeImageIds!.includes(iid));
        }
        await writeJson(env.BUCKET, ALBUMS_KEY, data);
        return json(data.albums[idx], 200, cors);
      }

      /* ── DELETE /albums/:albumId ─────────────────────────── */
      if (request.method === 'DELETE' && pathname.startsWith('/albums/')) {
        const albumId = pathname.slice('/albums/'.length);
        if (!albumId) return json({ error: 'Missing albumId' }, 400, cors);
        const data = await readJson<AlbumsData>(env.BUCKET, ALBUMS_KEY, { albums: [] });
        data.albums = data.albums.filter(a => a.id !== albumId);
        await writeJson(env.BUCKET, ALBUMS_KEY, data);
        return json({ success: true }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);

    } catch (err) {
      console.error('[PhotoStack Worker]', err);
      return json({ error: 'Internal server error' }, 500, cors);
    }
  },
};
