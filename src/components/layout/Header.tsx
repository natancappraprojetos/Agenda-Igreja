'use client';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  children?: React.ReactNode;
}

export default function Header({ title, onMenuToggle, children }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuToggle} aria-label="Menu">
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
