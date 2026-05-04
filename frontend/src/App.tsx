import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './index.css';
import type { ImageItem, UploadingFile, ToastMessage, Theme } from './types';
import { fetchImages, uploadImage, deleteImage, downloadImageById } from './api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Gallery from './components/Gallery';
import LightboxModal from './components/LightboxModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import BulkActionBar from './components/BulkActionBar';
import Toast from './components/Toast';

function genId() {
  return Math.random().toString(36).slice(2);
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('ps-theme') as Theme) || 'dark';
  });
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Compute total storage
  const totalStorage = useMemo(() => {
    return images.reduce((sum, img) => sum + img.size, 0);
  }, [images]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ps-theme', theme);
  }, [theme]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = genId();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load images on mount
  useEffect(() => {
    setLoading(true);
    fetchImages()
      .then(setImages)
      .catch(() => addToast('error', 'Không thể tải danh sách ảnh. Kiểm tra VITE_WORKER_URL.'))
      .finally(() => setLoading(false));
  }, [addToast]);

  // ── Upload ──────────────────────────────────────────────────
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const queue: UploadingFile[] = files.map(f => ({
      file: f, progress: 0, status: 'pending',
    }));
    setUploadingFiles(queue);

    for (let i = 0; i < files.length; i++) {
      setUploadingFiles(prev =>
        prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item)
      );
      try {
        const result = await uploadImage(files[i], (pct) => {
          setUploadingFiles(prev =>
            prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item)
          );
        });
        setUploadingFiles(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'done', progress: 100, result } : item)
        );
        setImages(prev => [result, ...prev]);
        addToast('success', `Upload thành công: ${files[i].name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload thất bại';
        setUploadingFiles(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: msg } : item)
        );
        addToast('error', `Lỗi: ${msg}`);
      }
    }
    setTimeout(() => setUploadingFiles([]), 3000);
  }, [addToast]);

  // ── Delete single ───────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteImage(deleteTarget.id);
      setImages(prev => prev.filter(img => img.id !== deleteTarget.id));
      addToast('success', `Đã xoá "${deleteTarget.name}"`);
      if (lightboxIndex !== null) {
        const idx = images.findIndex(img => img.id === deleteTarget.id);
        if (idx === lightboxIndex) setLightboxIndex(null);
      }
    } catch {
      addToast('error', 'Không thể xoá ảnh. Thử lại sau.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, addToast, lightboxIndex, images]);

  // ── Selection ───────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map(img => img.id)));
  }, [images]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleToggleSelectMode = useCallback(() => {
    if (selectionMode) {
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  }, [selectionMode, clearSelection]);

  // ── Bulk delete ─────────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    for (const id of ids) {
      try {
        await deleteImage(id);
        setImages(prev => prev.filter(img => img.id !== id));
        success++;
      } catch { /* continue */ }
    }
    addToast(success === ids.length ? 'success' : 'error',
      `Đã xoá ${success}/${ids.length} ảnh`);
    clearSelection();
    setBulkDeleting(false);
  }, [selectedIds, addToast, clearSelection]);

  // ── Bulk download ───────────────────────────────────────────
  const handleBulkDownload = useCallback(async () => {
    const selected = images.filter(img => selectedIds.has(img.id));
    if (selected.length === 0) return;
    setBulkDownloading(true);
    let success = 0;
    for (const img of selected) {
      try {
        await downloadImageById(img.id, img.name);
        success++;
        await new Promise(r => setTimeout(r, 400));
      } catch { /* continue */ }
    }
    addToast(success === selected.length ? 'success' : 'error',
      `Đã tải về ${success}/${selected.length} ảnh`);
    setBulkDownloading(false);
  }, [images, selectedIds, addToast]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  return (
    <div className="app-layout">
      <Sidebar 
        totalSize={totalStorage} 
        uploadingFiles={uploadingFiles}
        onFilesSelected={handleFilesSelected}
        uploadInputRef={uploadInputRef}
      />

      <main className="app-main">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onUploadClick={handleUploadClick}
        />

        <div className="content-area">
          <BulkActionBar
            selectedCount={selectedIds.size}
            totalCount={images.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDownload={handleBulkDownload}
            onBulkDelete={handleBulkDelete}
            downloading={bulkDownloading}
            deleting={bulkDeleting}
          />

          <Gallery
            images={images}
            loading={loading}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onView={setLightboxIndex}
            onDelete={setDeleteTarget}
            onToggleSelect={toggleSelect}
            onToggleSelectMode={handleToggleSelectMode}
            onUploadClick={handleUploadClick}
          />
        </div>
      </main>

      {lightboxIndex !== null && !selectionMode && (
        <LightboxModal
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex(i => Math.min(images.length - 1, (i ?? 0) + 1))}
          onDelete={(img) => setDeleteTarget(img)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          image={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;
