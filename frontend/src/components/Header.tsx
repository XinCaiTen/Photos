import React from 'react';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onUploadClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const SearchIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const CloudUploadIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const MoonIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);
const SunIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Header: React.FC<Props> = ({ theme, onToggleTheme, onUploadClick, searchQuery, onSearchChange }) => (
  <header className="header">
    <div className="search-bar">
      <SearchIcon />
      <input
        type="text"
        placeholder="Tìm kiếm theo tên ảnh..."
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        id="input-search"
      />
      {searchQuery && (
        <button onClick={() => onSearchChange('')} style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>✕</button>
      )}
    </div>

    <div className="header-actions">
      <button className="btn-upload" onClick={onUploadClick} id="btn-upload-header">
        <CloudUploadIcon /> Upload
      </button>
      <button className="btn-icon" onClick={onToggleTheme} title={theme === 'dark' ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'} id="btn-toggle-theme">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <div className="avatar">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width: 20, height: 20, color: 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    </div>
  </header>
);

export default Header;
