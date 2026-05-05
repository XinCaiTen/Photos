import React, { useState, useMemo } from 'react';
import type { ImageItem, Album } from '../types';

interface Props {
  allImages: ImageItem[];
  album: Album;
  onClose: () => void;
  onAdd: (imageIds: string[]) => void;
}



const AddPhotosToAlbumModal: React.FC<Props> = ({ allImages, album, onClose, onAdd }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState('');

  // Exclude images already in album
  const available = useMemo(() => {
    const inAlbum = new Set(album.imageIds);
    return allImages.filter(img => !inAlbum.has(img.id));
  }, [allImages, album.imageIds]);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return available;
    const q = searchQ.toLowerCase();
    return available.filter(img => img.name.toLowerCase().includes(q));
  }, [available, searchQ]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(img => img.id)));
  const clearAll = () => setSelected(new Set());

  const handleAdd = () => {
    const ids = Array.from(selected);
    if (ids.length > 0) onAdd(ids);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="add-photos-modal">
        {/* Header */}
        <div className="add-photos-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Thêm ảnh vào "{album.name}"</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {available.length} ảnh có thể thêm • {album.imageIds.length} ảnh đã có trong album
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Search + actions */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, height: 36 }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14, color: 'var(--text-muted)', marginRight: 8 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Tìm ảnh theo tên..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <button onClick={selected.size === filtered.length ? clearAll : selectAll}
            style={{ fontSize: 12, color: 'var(--accent-primary)', whiteSpace: 'nowrap', padding: '4px 8px' }}>
            {selected.size === filtered.length && filtered.length > 0 ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filtered.length})`}
          </button>
        </div>

        {/* Photo grid */}
        <div className="add-photos-grid">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              {available.length === 0 ? 'Tất cả ảnh đã có trong album rồi' : 'Không tìm thấy ảnh phù hợp'}
            </div>
          ) : (
            filtered.map(img => {
              const isSelected = selected.has(img.id);
              const displayUrl = img.thumbnailUrl || img.url;
              return (
                <div
                  key={img.id}
                  className={`add-photo-item${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleSelect(img.id)}
                >
                  <img src={displayUrl} alt={img.name} loading="lazy" style={{ objectFit: 'cover' }} />
                  <div className={`add-photo-check${isSelected ? ' checked' : ''}`}>
                    {isSelected && '✓'}
                  </div>
                  <div className="add-photo-name">{img.name}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {selected.size > 0 ? `Đã chọn ${selected.size} ảnh` : 'Chưa chọn ảnh nào'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-cancel" style={{ padding: '8px 18px' }} onClick={onClose}>Hủy</button>
            <button
              className="btn-danger"
              style={{ background: 'var(--accent-primary)', padding: '8px 18px', opacity: selected.size === 0 ? 0.5 : 1 }}
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              Thêm {selected.size > 0 ? `${selected.size} ảnh` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPhotosToAlbumModal;
