'use client';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  children?: React.ReactNode;
}

export default function Header({ title, onMenuToggle, children }: HeaderProps) {
  const handleToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
    // Dispatch a global event so layout.tsx can open the sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toggleSidebar'));
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={handleToggle} aria-label="Menu">
          ☰
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-right">
        {children}
      </div>
    </header>
  );
}
