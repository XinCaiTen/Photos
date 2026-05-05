import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import type { ImageItem, SortOption, Album, View } from '../types';
import ImageCard from './ImageCard';
import EmptyState from './EmptyState';

// ─── Constants ────────────────────────────────────────────────────────────────
const TARGET_ROW_HEIGHT = 220;   // target height (px) for each justified row
const GAP = 4;                   // gap between items (px)
const OVERSCAN_PX = 800;         // px to render beyond viewport edges
const SKELETON_COUNT = 20;

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

// ─── Layout types ─────────────────────────────────────────────────────────────
interface LayoutItem {
  top: number;
  left: number;
  width: number;
  height: number;
  index: number;
}

interface LayoutRow {
  top: number;
  height: number;
  bottom: number;
  items: LayoutItem[];
}

// ─── Justified layout engine ──────────────────────────────────────────────────
function computeJustifiedLayout(
  aspectRatios: number[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number
): { rows: LayoutRow[]; totalHeight: number } {
  if (containerWidth <= 0 || aspectRatios.length === 0) {
    return { rows: [], totalHeight: 0 };
  }

  const rows: LayoutRow[] = [];
  let pending: { index: number; ar: number }[] = [];
  let pendingARSum = 0;
  let currentTop = 0;

  const flushRow = (items: typeof pending, forceJustify: boolean) => {
    if (items.length === 0) return;
    const totalGap = gap * (items.length - 1);
    let rowHeight: number;

    if (forceJustify) {
      rowHeight = Math.round((containerWidth - totalGap) / pendingARSum);
      rowHeight = Math.min(rowHeight, targetRowHeight * 2);
    } else {
      rowHeight = targetRowHeight;
    }
    rowHeight = Math.max(80, rowHeight);

    const layoutItems: LayoutItem[] = [];
    let left = 0;

    for (let i = 0; i < items.length; i++) {
      const { index, ar } = items[i];
      const width = Math.round(ar * rowHeight);
      layoutItems.push({ top: currentTop, left, width, height: rowHeight, index });
      left += width + gap;
    }

    // Fix floating-point rounding on last item
    if (forceJustify && layoutItems.length > 0) {
      const last = layoutItems[layoutItems.length - 1];
      const diff = containerWidth - (last.left + last.width);
      if (Math.abs(diff) < 15) last.width += diff;
    }

    const bottom = currentTop + rowHeight;
    rows.push({ top: currentTop, height: rowHeight, bottom, items: layoutItems });
    currentTop = bottom + gap;
  };

  for (let i = 0; i < aspectRatios.length; i++) {
    const ar = aspectRatios[i];
    const newARSum = pendingARSum + ar;
    const totalGap = gap * pending.length;
    const projectedHeight = (containerWidth - totalGap) / newARSum;

    pending.push({ index: i, ar });
    pendingARSum = newARSum;

    const isLast = i === aspectRatios.length - 1;

    if (projectedHeight <= targetRowHeight || isLast) {
      const shouldJustify = !isLast || (isLast && projectedHeight <= targetRowHeight);
      flushRow(pending, shouldJustify);
      pending = [];
      pendingARSum = 0;
    }
  }

  return { rows, totalHeight: Math.max(0, currentTop - gap) };
}

// ─── ChevronDown icon ─────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

// ─── Gallery ──────────────────────────────────────────────────────────────────
const Gallery: React.FC<Props> = ({
  images, loading, selectionMode, selectedIds, favoriteIds, albums,
  currentView, sortOption, selectedMonth,
  onView, onDelete, onToggleSelect, onToggleSelectMode, onUploadClick,
  onSortChange, onMonthChange, onAddPhotosToAlbum, onRemoveFromAlbum,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // The containerRef is the FIXED outer div — always in DOM regardless of loading/empty state.
  // This ensures useLayoutEffect can always read its dimensions.
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Per-image aspect ratio cache
  const [aspectRatioMap, setAspectRatioMap] = useState<Record<string, number>>({});

  // ── Close sort dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Measure container — useLayoutEffect so it fires before paint ──────────
  // containerRef is always mounted (it wraps the whole gallery area including toolbar),
  // so this runs correctly on first mount.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(rect.width);
      if (rect.height > 0) setViewportHeight(rect.height);
    };
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Scroll handler — throttled via rAF ───────────────────────────────────
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
      rafRef.current = 0;
    });
  }, []);

  // ── Aspect ratios array ────────────────────────────────────────────────────
  const aspectRatiosArray = useMemo(
    () => images.map(img => aspectRatioMap[img.id] ?? 4 / 3),
    [images, aspectRatioMap]
  );

  // ── Compute justified layout ───────────────────────────────────────────────
  const { rows, totalHeight } = useMemo(
    () => computeJustifiedLayout(aspectRatiosArray, containerWidth, TARGET_ROW_HEIGHT, GAP),
    [aspectRatiosArray, containerWidth]
  );

  // ── Visible items for virtualization ──────────────────────────────────────
  const visibleItems = useMemo(() => {
    if (rows.length === 0) return [];
    const renderTop = Math.max(0, scrollTop - OVERSCAN_PX);
    const renderBottom = scrollTop + Math.max(viewportHeight, 600) + OVERSCAN_PX;

    const items: LayoutItem[] = [];
    for (const row of rows) {
      if (row.bottom < renderTop) continue;
      if (row.top > renderBottom) break;
      items.push(...row.items);
    }
    return items;
  }, [rows, scrollTop, viewportHeight]);

  // ── Aspect ratio callback from ImageCard ──────────────────────────────────
  const handleAspectRatio = useCallback((id: string, ratio: number) => {
    setAspectRatioMap(prev => {
      if (prev[id] !== undefined && Math.abs(prev[id] - ratio) < 0.05) return prev;
      return { ...prev, [id]: ratio };
    });
  }, []);

  const viewTitle = currentView === 'all' ? 'Tất cả hình ảnh'
    : currentView === 'favorites' ? '❤️ Favorites'
      : albums.find(a => a.id === currentView)?.name ?? 'Album';

  const sortLabel = sortOption === 'newest' ? 'Mới nhất'
    : sortOption === 'oldest' ? 'Cũ nhất' : 'Theo tháng';

  // ── Render inner content (loading / empty / grid) ─────────────────────────
  const renderContent = () => {
    if (loading) {
      return (
        <div className="gallery-grid" style={{ padding: '0 0 24px' }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="skeleton" id={`skeleton-${i}`} />
          ))}
        </div>
      );
    }

    if (images.length === 0) {
      return <EmptyState onUploadClick={onUploadClick} />;
    }

    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Spacer div sets total scrollable height */}
        <div style={{ position: 'relative', width: '100%', height: totalHeight > 0 ? totalHeight : 1 }}>
          {visibleItems.map(item => {
            const img = images[item.index];
            return (
              <div
                key={img.id}
                style={{
                  position: 'absolute',
                  top: item.top,
                  left: item.left,
                  width: item.width,
                  height: item.height,
                  contain: 'strict',
                  willChange: 'transform',
                }}
              >
                <ImageCard
                  image={img}
                  index={item.index}
                  onView={() => onView(item.index)}
                  onDelete={() => onDelete(img)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(img.id)}
                  isFavorite={favoriteIds.has(img.id)}
                  onToggleSelect={() => onToggleSelect(img.id)}
                  onAspectRatio={handleAspectRatio}
                  onRemoveFromAlbum={
                    currentView !== 'all' && currentView !== 'favorites'
                      ? () => onRemoveFromAlbum(img.id)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    // containerRef wraps EVERYTHING — always mounted, so ResizeObserver always works
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div className="gallery-toolbar">
        <div className="gallery-title-group">
          <h1>
            {loading ? 'Tất cả hình ảnh' : selectionMode ? 'Chế độ chọn' : viewTitle}
            {' '}<ChevronDown />
          </h1>
          <div className="gallery-subtitle">
            {loading ? 'Đang tải...' : `${images.length} ảnh`}
          </div>
        </div>

        {!loading && images.length > 0 && (
          <div className="gallery-controls">
            {currentView !== 'all' && currentView !== 'favorites' && (
              <button
                className="btn-select"
                onClick={onAddPhotosToAlbum}
                style={{ background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }}
              >
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
                    <button
                      key={opt}
                      className={`sort-dropdown-item ${sortOption === opt ? 'active' : ''}`}
                      onClick={() => { onSortChange(opt); setSortOpen(false); }}
                    >
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
        )}
      </div>

      {/* ── Content area (loading / empty / grid) ── */}
      {renderContent()}
    </div>
  );
};

export default Gallery;
