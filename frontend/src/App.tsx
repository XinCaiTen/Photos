import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './index.css';
import type { ImageItem, UploadingFile, ToastMessage, Theme, Album, SortOption, View } from './types';
import {
  fetchImages, uploadImage, deleteImage, downloadImageById, renameImage,
  fetchFavorites, addFavorite, removeFavorite,
  fetchAlbums, createAlbum, deleteAlbum, updateAlbum,
} from './api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Gallery from './components/Gallery';
import LightboxModal from './components/LightboxModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import BulkActionBar from './components/BulkActionBar';
import MoveToAlbumModal from './components/MoveToAlbumModal';
import Toast from './components/Toast';

function genId() { return Math.random().toString(36).slice(2); }

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('ps-theme') as Theme) || 'dark');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedMonth, setSelectedMonth] = useState('');

  // View
  const [currentView, setCurrentView] = useState<View>('all');

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Albums
  const [albums, setAlbums] = useState<Album[]>([]);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // ── Apply theme ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ps-theme', theme);
  }, [theme]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = genId();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ── Load data on mount ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchImages(),
      fetchFavorites().catch(() => ({ ids: [] as string[] })),
      fetchAlbums().catch(() => [] as Album[]),
    ]).then(([imgs, favs, albs]) => {
      setImages(imgs);
      setFavoriteIds(new Set(favs.ids));
      setAlbums(albs);
    }).catch(() => addToast('error', 'Không thể tải danh sách ảnh. Kiểm tra VITE_WORKER_URL.'))
      .finally(() => setLoading(false));
  }, [addToast]);

  // ── Computed: filtered + sorted images ─────────────────────────
  const displayedImages = useMemo(() => {
    let result = [...images];

    // Filter by view
    if (currentView === 'favorites') {
      result = result.filter(img => favoriteIds.has(img.id));
    } else if (currentView !== 'all') {
      const album = albums.find(a => a.id === currentView);
      result = result.filter(img => album?.imageIds.includes(img.id));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(img => img.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortOption === 'month' && selectedMonth) {
      result = result.filter(img => img.createdAt.startsWith(selectedMonth));
    }

    return result;
  }, [images, currentView, favoriteIds, albums, searchQuery, sortOption, selectedMonth]);

  const totalStorage = useMemo(() => images.reduce((sum, img) => sum + img.size, 0), [images]);

  // ── Upload ───────────────────────────────────────────────────────
  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Block duplicates
    const existingNames = new Set(images.map(img => img.name));
    const dupes = files.filter(f => existingNames.has(f.name));
    const toUpload = files.filter(f => !existingNames.has(f.name));

    if (dupes.length > 0) {
      addToast('error', `Bỏ qua ${dupes.length} ảnh trùng tên: ${dupes.map(f => f.name).join(', ')}`);
    }
    if (toUpload.length === 0) return;

    const queue: UploadingFile[] = toUpload.map(f => ({ file: f, progress: 0, status: 'pending' }));
    setUploadingFiles(queue);

    for (let i = 0; i < toUpload.length; i++) {
      setUploadingFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));
      try {
        const result = await uploadImage(toUpload[i], (pct) => {
          setUploadingFiles(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
        });
        setUploadingFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', progress: 100, result } : item));
        setImages(prev => [result, ...prev]);
        addToast('success', `Upload thành công: ${toUpload[i].name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload thất bại';
        setUploadingFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: msg } : item));
        addToast('error', `Lỗi: ${msg}`);
      }
    }
    setTimeout(() => setUploadingFiles([]), 3000);
  }, [images, addToast]);

  // ── Delete single ────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteImage(deleteTarget.id);
      setImages(prev => prev.filter(img => img.id !== deleteTarget.id));
      setFavoriteIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      addToast('success', `Đã xoá "${deleteTarget.name}"`);
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch { addToast('error', 'Không thể xoá ảnh. Thử lại sau.'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }, [deleteTarget, addToast, lightboxIndex]);

  // ── Selection ────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const selectAll = useCallback(() => setSelectedIds(new Set(displayedImages.map(img => img.id))), [displayedImages]);
  const clearSelection = useCallback(() => { setSelectedIds(new Set()); setSelectionMode(false); }, []);
  const handleToggleSelectMode = useCallback(() => { if (selectionMode) clearSelection(); else setSelectionMode(true); }, [selectionMode, clearSelection]);

  // ── Bulk delete ──────────────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    for (const id of ids) {
      try { await deleteImage(id); setImages(prev => prev.filter(img => img.id !== id)); success++; }
      catch { /* continue */ }
    }
    addToast(success === ids.length ? 'success' : 'error', `Đã xoá ${success}/${ids.length} ảnh`);
    clearSelection();
    setBulkDeleting(false);
  }, [selectedIds, addToast, clearSelection]);

  // ── Bulk download ─────────────────────────────────────────────────
  const handleBulkDownload = useCallback(async () => {
    const selected = displayedImages.filter(img => selectedIds.has(img.id));
    if (selected.length === 0) return;
    setBulkDownloading(true);
    let success = 0;
    for (const img of selected) {
      try { await downloadImageById(img.id, img.name); success++; await new Promise(r => setTimeout(r, 400)); }
      catch { /* continue */ }
    }
    addToast(success === selected.length ? 'success' : 'error', `Đã tải về ${success}/${selected.length} ảnh`);
    setBulkDownloading(false);
  }, [displayedImages, selectedIds, addToast]);

  // ── Move to album ─────────────────────────────────────────────────
  const handleMoveToAlbum = useCallback(async (albumId: string) => {
    const ids = Array.from(selectedIds);
    try {
      const updatedAlbum = await updateAlbum(albumId, { addImageIds: ids });
      setAlbums(prev => prev.map(a => a.id === albumId ? updatedAlbum : a));
      addToast('success', `Đã thêm ${ids.length} ảnh vào album`);
      clearSelection();
    } catch { addToast('error', 'Không thể di chuyển ảnh vào album'); }
  }, [selectedIds, addToast, clearSelection]);

  // ── Favorites ─────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async (image: ImageItem) => {
    const isFav = favoriteIds.has(image.id);
    setFavoriteIds(prev => { const next = new Set(prev); isFav ? next.delete(image.id) : next.add(image.id); return next; });
    try {
      if (isFav) await removeFavorite(image.id); else await addFavorite(image.id);
    } catch {
      setFavoriteIds(prev => { const next = new Set(prev); isFav ? next.add(image.id) : next.delete(image.id); return next; });
      addToast('error', 'Không thể cập nhật yêu thích');
    }
  }, [favoriteIds, addToast]);

  // ── Albums ────────────────────────────────────────────────────────
  const handleCreateAlbum = useCallback(async (name: string) => {
    try {
      const album = await createAlbum(name);
      setAlbums(prev => [...prev, album]);
      addToast('success', `Đã tạo album "${name}"`);
    } catch { addToast('error', 'Không thể tạo album'); }
  }, [addToast]);

  const handleDeleteAlbum = useCallback(async (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    try {
      await deleteAlbum(albumId);
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      if (currentView === albumId) setCurrentView('all');
      addToast('success', `Đã xóa album "${album?.name ?? ''}"`);
    } catch { addToast('error', 'Không thể xóa album'); }
  }, [albums, currentView, addToast]);

  // ── Rename ────────────────────────────────────────────────────────
  const handleRename = useCallback(async (image: ImageItem, newName: string) => {
    try {
      const updated = await renameImage(image.id, newName);
      setImages(prev => prev.map(img => img.id === updated.id ? updated : img));
      addToast('success', `Đổi tên thành "${newName}"`);
    } catch { addToast('error', 'Không thể đổi tên ảnh'); throw new Error('rename failed'); }
  }, [addToast]);

  // ── Single image album ───────────────────────────────────────────
  const handleAddToAlbum = useCallback(async (image: ImageItem, albumId: string) => {
    try {
      const updated = await updateAlbum(albumId, { addImageIds: [image.id] });
      setAlbums(prev => prev.map(a => a.id === albumId ? updated : a));
      addToast('success', `Đã thêm vào album`);
    } catch { addToast('error', 'Không thể thêm vào album'); }
  }, [addToast]);

  const handleRemoveFromAlbum = useCallback(async (image: ImageItem, albumId: string) => {
    try {
      const updated = await updateAlbum(albumId, { removeImageIds: [image.id] });
      setAlbums(prev => prev.map(a => a.id === albumId ? updated : a));
      addToast('info', `Đã xóa khỏi album`);
    } catch { addToast('error', 'Không thể xóa khỏi album'); }
  }, [addToast]);

  const handleUploadClick = () => uploadInputRef.current?.click();

  // lightbox uses displayedImages index
  const lightboxImage = lightboxIndex !== null ? displayedImages[lightboxIndex] : null;
  const isFavorite = lightboxImage ? favoriteIds.has(lightboxImage.id) : false;

  return (
    <div className="app-layout">
      <Sidebar
        totalSize={totalStorage}
        uploadingFiles={uploadingFiles}
        onFilesSelected={handleFilesSelected}
        uploadInputRef={uploadInputRef}
        currentView={currentView}
        onViewChange={setCurrentView}
        albums={albums}
        onCreateAlbum={handleCreateAlbum}
        onDeleteAlbum={handleDeleteAlbum}
        favoriteCount={favoriteIds.size}
      />

      <main className="app-main">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onUploadClick={handleUploadClick}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="content-area">
          <BulkActionBar
            selectedCount={selectedIds.size}
            totalCount={displayedImages.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDownload={handleBulkDownload}
            onBulkDelete={handleBulkDelete}
            onMoveToAlbum={() => setShowMoveModal(true)}
            downloading={bulkDownloading}
            deleting={bulkDeleting}
            hasAlbums={albums.length > 0}
          />

          <Gallery
            images={displayedImages}
            loading={loading}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            favoriteIds={favoriteIds}
            albums={albums}
            currentView={currentView}
            sortOption={sortOption}
            selectedMonth={selectedMonth}
            onView={setLightboxIndex}
            onDelete={setDeleteTarget}
            onToggleSelect={toggleSelect}
            onToggleSelectMode={handleToggleSelectMode}
            onUploadClick={handleUploadClick}
            onSortChange={setSortOption}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </main>

      {lightboxIndex !== null && !selectionMode && lightboxImage && (
        <LightboxModal
          images={displayedImages}
          currentIndex={lightboxIndex}
          isFavorite={isFavorite}
          albums={albums}
          currentAlbumIds={albums.filter(a => a.imageIds.includes(lightboxImage.id)).map(a => a.id)}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex(i => Math.min(displayedImages.length - 1, (i ?? 0) + 1))}
          onDelete={img => setDeleteTarget(img)}
          onToggleFavorite={handleToggleFavorite}
          onRename={handleRename}
          onAddToAlbum={handleAddToAlbum}
          onRemoveFromAlbum={handleRemoveFromAlbum}
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

      {showMoveModal && (
        <MoveToAlbumModal
          albums={albums}
          selectedIds={selectedIds}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMoveToAlbum}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;
