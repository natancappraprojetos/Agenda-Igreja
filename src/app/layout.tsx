import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/hooks/useToast';
import { AuthProvider } from '@/lib/hooks/useAuth';

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
