import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import type { ImageItem, SortOption, Album, View } from '../types';
import ImageCard from './ImageCard';
import EmptyState from './EmptyState';

const MIN_COL_WIDTH = 180;
const GAP = 12;

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

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fee' }}>
          <h2>Gallery Crash:</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const GalleryInner: React.FC<Props> = ({
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

  const Cell = useCallback(({ columnIndex, rowIndex, style, data }: {
    columnIndex: number; rowIndex: number;
    style: React.CSSProperties;
    data: { colCount: number; itemSize: number };
  }) => {
    const { colCount } = data;
    const idx = rowIndex * colCount + columnIndex;
    if (idx >= images.length) return null;
    const img = images[idx];
    return (
      <div style={{ ...style, boxSizing: 'border-box', paddingLeft: GAP, paddingTop: GAP }}>
        <ImageCard
          image={img}
          index={idx}
          onView={() => onView(idx)}
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
      </div>
    );
  }, [images, selectionMode, selectedIds, favoriteIds, currentView, onView, onDelete, onToggleSelect, onRemoveFromAlbum]);

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

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="gallery-toolbar">
        <div className="gallery-title-group">
          <h1>{selectionMode ? 'Chế độ chọn' : viewTitle} <ChevronDown /></h1>
          <div className="gallery-subtitle">{images.length} ảnh</div>
        </div>

        <div className="gallery-controls">
          {currentView !== 'all' && currentView !== 'favorites' && (
            <button className="btn-select" onClick={onAddPhotosToAlbum} style={{ background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }}>
              + Thêm ảnh
            </button>
          )}

          <button className={`btn-select ${selectionMode ? 'active' : ''}`} onClick={onToggleSelectMode}>
            {selectionMode ? 'Hủy chọn' : 'Chọn'}
          </button>

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

      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, marginTop: GAP }}>
        {width > 0 && height > 0 && (() => {
          const colCount = Math.max(2, Math.floor((width - GAP) / (MIN_COL_WIDTH + GAP)));
          const itemSize = Math.max(MIN_COL_WIDTH, Math.floor((width - GAP * (colCount + 1)) / colCount));
          const rowCount = Math.ceil(images.length / colCount);
          return (
            <Grid
              columnCount={colCount}
              rowCount={rowCount}
              columnWidth={itemSize + GAP}
              rowHeight={itemSize + GAP}
              width={width}
              height={height}
              itemData={{ colCount, itemSize }}
              style={{ overflowX: 'hidden' }}
            >
              {Cell}
            </Grid>
          );
        })()}
      </div>
    </div>
  );
};

export default function Gallery(props: Props) {
  return (
    <ErrorBoundary>
      <GalleryInner {...props} />
    </ErrorBoundary>
  );
}
