import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/hooks/useToast';

export const metadata: Metadata = {
  title: 'Central Santo Afonso',
  description: 'Sistema de gerenciamento de programação da Igreja Santo Afonso.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
