import React from 'react';

interface Props {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  downloading: boolean;
  deleting: boolean;
}

const BulkActionBar: React.FC<Props> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  downloading,
  deleting,
}) => {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div className="bulk-bar" id="bulk-action-bar">
      <div className="bulk-bar-info">
        <span className="bulk-bar-count">
          ✔ {selectedCount} ảnh đã chọn
        </span>
        <button
          className="bulk-bar-link"
          onClick={allSelected ? onClearSelection : onSelectAll}
          id="btn-bulk-select-all"
        >
          {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${totalCount})`}
        </button>
        <button
          className="bulk-bar-link"
          onClick={onClearSelection}
          id="btn-bulk-clear"
        >
          Huỷ
        </button>
      </div>

      <div className="bulk-bar-actions">
        <button
          className="bulk-btn bulk-btn-download"
          onClick={onBulkDownload}
          disabled={downloading || deleting}
          id="btn-bulk-download"
        >
          {downloading ? '⏳ Đang tải...' : '⬇️ Tải về'}
        </button>
        <button
          className="bulk-btn bulk-btn-delete"
          onClick={onBulkDelete}
          disabled={downloading || deleting}
          id="btn-bulk-delete"
        >
          {deleting ? '⏳ Đang xoá...' : '🗑️ Xoá'}
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
