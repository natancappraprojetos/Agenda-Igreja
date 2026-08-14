import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/hooks/useToast';

export const metadata: Metadata = {
  title: 'Agenda Igreja — Sistema de Gerenciamento',
  description: 'Sistema de gerenciamento de programação, agenda, escalas e liturgias da igreja.',
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
