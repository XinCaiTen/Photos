# 📸 PhotoStack

> Ứng dụng quản lý ảnh đám mây nhẹ, miễn phí – tương tự Google Photos.
> Stack: **Vite + React + TypeScript** (Frontend) · **Cloudflare Worker** (API) · **Cloudflare R2** (Storage)

---

## 🗂️ Cấu trúc thư mục

```
PhotoStack/
├── worker/          ← Cloudflare Worker (API backend)
│   ├── src/index.ts
│   ├── wrangler.toml
│   └── package.json
├── frontend/        ← Vite React App
│   ├── src/
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🚀 Hướng dẫn Deploy

### Bước 1: Chuẩn bị Cloudflare R2

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **R2 Object Storage** → **Create bucket**
   - Tên bucket: `photostack-images` (hoặc tên bạn muốn)
3. Bật **Public Access** cho bucket → copy **Public Bucket URL**
   - Ví dụ: `https://pub-abc123.r2.dev`

### Bước 2: Cấu hình Worker

Chỉnh file `worker/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "photostack-images"   # ← tên bucket của bạn

[vars]
PUBLIC_URL = "https://pub-CHANGE_ME.r2.dev"   # ← URL public của bucket
ALLOWED_ORIGINS = "http://localhost:5173,https://your-app.vercel.app"
```

### Bước 3: Deploy Worker

```bash
cd worker
npm install
npm run deploy
```

Sau khi deploy, copy URL Worker (ví dụ: `https://photostack-worker.yourname.workers.dev`)

### Bước 4: Cấu hình Frontend

```bash
cd frontend
cp .env.example .env
```

Chỉnh `.env`:
```env
VITE_WORKER_URL=https://photostack-worker.yourname.workers.dev
```

### Bước 5: Chạy local

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173

### Bước 6: Deploy Frontend lên Vercel

1. Push code lên GitHub
2. Vào [Vercel](https://vercel.com) → **New Project** → Import repo
3. Set **Root Directory** = `frontend`
4. Thêm Environment Variable: `VITE_WORKER_URL` = URL Worker của bạn
5. Deploy!

---

## ✨ Tính năng

| Tính năng | Trạng thái |
|-----------|-----------|
| Upload ảnh (drag & drop) | ✅ |
| Upload nhiều file cùng lúc | ✅ |
| Progress bar upload | ✅ |
| Validate type & size (5MB) | ✅ |
| Gallery grid responsive | ✅ |
| Lazy loading + skeleton | ✅ |
| Lightbox full screen | ✅ |
| Điều hướng prev/next (bàn phím) | ✅ |
| Tải ảnh về | ✅ |
| Copy link ảnh | ✅ |
| Xoá ảnh + confirm | ✅ |
| Dark mode / Light mode | ✅ |
| Toast notifications | ✅ |
| Empty state | ✅ |

---

## 🔧 API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/images` | Lấy danh sách ảnh |
| POST | `/upload` | Upload ảnh (multipart/form-data) |
| DELETE | `/images/:id` | Xoá ảnh theo ID |

---

## 💰 Chi phí ước tính

Dùng **Cloudflare free tier**:
- R2: 10GB storage miễn phí + 1M GET + 1M PUT/tháng
- Worker: 100,000 request/ngày miễn phí
- Vercel: Miễn phí cho hobby projects

**→ Tổng chi phí: $0/tháng** cho dùng cá nhân

---

## 📝 Metadata

Danh sách ảnh được lưu trong file `metadata.json` ngay trong R2 bucket.
Không cần database, không cần subscription.

****************************************
Github
# Build với URL mới
cd e:\Code\PhotoStack\frontend
npm run build

# Copy vào docs/
cd e:\Code\PhotoStack
Remove-Item -Recurse -Force docs
Copy-Item -Recurse frontend\dist docs

# Push lên GitHub
git add docs/
git commit -m "deploy: rebuild with VITE_WORKER_URL"
git push
