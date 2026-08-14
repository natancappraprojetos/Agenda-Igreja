import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
