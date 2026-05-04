import React, { useState, useRef, useEffect } from 'react';
import type { ImageItem, SortOption, Album, View } from '../types';
import ImageCard from './ImageCard';
import EmptyState from './EmptyState';

interface Props {
  images: ImageItem[];
  loading: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  favoriteIds: Set<string>;
  albums: Album[];
  currentView: View;
  sortOption: SortOption;
  selectedMonth: string;
  onView: (index: number) => void;
  onDelete: (image: ImageItem) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectMode: () => void;
  onUploadClick: () => void;
  onSortChange: (sort: SortOption) => void;
  onMonthChange: (month: string) => void;
  onAddPhotosToAlbum: () => void;
  onRemoveFromAlbum: (imageId: string) => void;
}

const SKELETON_COUNT = 12;

const ChevronDown = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const Gallery: React.FC<Props> = ({
  images, loading, selectionMode, selectedIds, favoriteIds, albums,
  currentView, sortOption, selectedMonth,
  onView, onDelete, onToggleSelect, onToggleSelectMode, onUploadClick,
  onSortChange, onMonthChange, onAddPhotosToAlbum, onRemoveFromAlbum,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const viewTitle = currentView === 'all' ? 'Tất cả hình ảnh'
    : currentView === 'favorites' ? '❤️ Favorites'
    : albums.find(a => a.id === currentView)?.name ?? 'Album';

  const sortLabel = sortOption === 'newest' ? 'Mới nhất' : sortOption === 'oldest' ? 'Cũ nhất' : 'Theo tháng';

  if (loading) {
    return (
      <div>
        <div className="gallery-toolbar">
          <div className="gallery-title-group"><h1>All Photos <ChevronDown /></h1><div className="gallery-subtitle">Đang tải...</div></div>
        </div>
        <div className="gallery-grid">{Array.from({ length: SKELETON_COUNT }).map((_, i) => <div key={i} className="skeleton" id={`skeleton-${i}`} />)}</div>
      </div>
    );
  }

  if (images.length === 0) return <EmptyState onUploadClick={onUploadClick} />;

  return (
    <div>
      <div className="gallery-toolbar">
        <div className="gallery-title-group">
          <h1>{selectionMode ? 'Chế độ chọn' : viewTitle} <ChevronDown /></h1>
          <div className="gallery-subtitle">{images.length} ảnh</div>
        </div>

        <div className="gallery-controls">
          {/* Add photos button — only when viewing a specific album */}
          {currentView !== 'all' && currentView !== 'favorites' && (
            <button className="btn-select" onClick={onAddPhotosToAlbum} style={{ background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }}>
              + Thêm ảnh
            </button>
          )}

          <button className={`btn-select ${selectionMode ? 'active' : ''}`} onClick={onToggleSelectMode}>
            {selectionMode ? 'Hủy chọn' : 'Chọn'}
          </button>

          {/* Sort dropdown */}
          <div className="sort-dropdown-wrapper" ref={sortRef}>
            <button className="sort-dropdown-btn" onClick={() => setSortOpen(o => !o)}>
              {sortLabel} <ChevronDown />
            </button>
            {sortOpen && (
              <div className="sort-dropdown-menu">
                {(['newest', 'oldest', 'month'] as SortOption[]).map(opt => (
                  <button key={opt} className={`sort-dropdown-item ${sortOption === opt ? 'active' : ''}`}
                    onClick={() => { onSortChange(opt); setSortOpen(false); }}>
                    {opt === 'newest' ? 'Mới nhất' : opt === 'oldest' ? 'Cũ nhất' : 'Theo tháng'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {sortOption === 'month' && (
            <input
              type="month"
              className="month-picker"
              value={selectedMonth}
              onChange={e => onMonthChange(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="gallery-grid" id="gallery-grid">
        {images.map((img, index) => (
          <ImageCard
            key={img.id}
            image={img}
            index={index}
            onView={() => onView(index)}
            onDelete={() => onDelete(img)}
            selectionMode={selectionMode}
            selected={selectedIds.has(img.id)}
            isFavorite={favoriteIds.has(img.id)}
            onToggleSelect={() => onToggleSelect(img.id)}
            onRemoveFromAlbum={
              currentView !== 'all' && currentView !== 'favorites'
                ? () => onRemoveFromAlbum(img.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
