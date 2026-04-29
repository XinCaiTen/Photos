/* ─── Cloudflare Worker – PhotoStack API ──────────────────────── */

export interface Env {
  BUCKET: R2Bucket;
  PUBLIC_URL: string;       // e.g. https://pub-xxx.r2.dev
  ALLOWED_ORIGINS: string;  // comma-separated origins
}

interface ImageMeta {
  id: string;
  url: string;
  name: string;
  size: number;
  createdAt: string;
}

interface Metadata {
  images: ImageMeta[];
}

const METADATA_KEY = 'metadata.json';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// No file size limit

// ─── Helpers ─────────────────────────────────────────────────────

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [];

  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
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

async function readMetadata(bucket: R2Bucket): Promise<Metadata> {
  const obj = await bucket.get(METADATA_KEY);
  if (!obj) return { images: [] };
  try {
    return (await obj.json()) as Metadata;
  } catch {
    return { images: [] };
  }
}

async function writeMetadata(bucket: R2Bucket, data: Metadata): Promise<void> {
  await bucket.put(METADATA_KEY, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' },
  });
}

// ─── Main Handler ─────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request, env);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    try {
      /* ── GET /images ─────────────────────────────────────── */
      if (request.method === 'GET' && pathname === '/images') {
        const meta = await readMetadata(env.BUCKET);
        return json(meta.images, 200, cors);
      }

      /* ── POST /upload ────────────────────────────────────── */
      if (request.method === 'POST' && pathname === '/upload') {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return json({ error: 'Expected multipart/form-data' }, 400, cors);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) return json({ error: 'No file provided' }, 400, cors);

        if (!ALLOWED_TYPES.has(file.type)) {
          return json(
            { error: 'Loại file không được phép. Chỉ chấp nhận JPG, PNG, WEBP, GIF.' },
            400,
            cors
          );
        }



        const timestamp = Date.now();
        const rand = randomId();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `images/${timestamp}_${rand}_${safeName}`;

        await env.BUCKET.put(key, await file.arrayBuffer(), {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000',
          },
        });

        const publicUrl = `${env.PUBLIC_URL}/${key}`;
        const imageMeta: ImageMeta = {
          id: key,
          url: publicUrl,
          name: file.name,
          size: file.size,
          createdAt: new Date().toISOString(),
        };

        const meta = await readMetadata(env.BUCKET);
        meta.images.unshift(imageMeta);
        await writeMetadata(env.BUCKET, meta);

        return json(imageMeta, 201, cors);
      }

      /* ── GET /download/:id ───────────────────────────────── */
      if (request.method === 'GET' && pathname.startsWith('/download/')) {
        const id = decodeURIComponent(pathname.slice('/download/'.length));
        if (!id) return json({ error: 'Missing id' }, 400, cors);

        const obj = await env.BUCKET.get(id);
        if (!obj) return json({ error: 'Not found' }, 404, cors);

        // Strip timestamp_rand_ prefix to get original filename
        const rawName = id.split('/').pop() || 'download';
        const cleanName = rawName.replace(/^\d+_[a-z0-9]+_/, '');

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

        const meta = await readMetadata(env.BUCKET);
        meta.images = meta.images.filter((img) => img.id !== id);
        await writeMetadata(env.BUCKET, meta);

        return json({ success: true }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);

    } catch (err) {
      console.error('[PhotoStack Worker]', err);
      return json({ error: 'Internal server error' }, 500, cors);
    }
  },
};
