'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-secondary)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 'var(--space-4)',
      textAlign: 'center'
    }}>
      <div className="card" style={{ padding: 'var(--space-8)', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Algo deu errado!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Ocorreu um erro inesperado ao carregar a página. Tente recarregar.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => reset()}
          >
            Tentar Novamente
          </button>
          <Link href="/agendar" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
            Ir para Agendamento
          </Link>
        </div>
      </div>
    </div>
  );
}
