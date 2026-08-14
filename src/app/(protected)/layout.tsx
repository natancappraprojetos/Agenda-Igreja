'use client';

import { useState } from 'react';

import { ToastProvider } from '@/lib/hooks/useToast';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
        <div className="app-layout">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="app-main">
            {children}
          </main>
          <MobileNav />
        </div>
  );
}
