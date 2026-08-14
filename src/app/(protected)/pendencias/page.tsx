'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import type { EventPendency } from '@/lib/types';
import { formatDateShort } from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

export default function PendenciasPage() {
  const [pendencies, setPendencies] = useState<EventPendency[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete'>('pending');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('event_pendencies')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    setPendencies((data || []) as EventPendency[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = pendencies.filter(p => {
    if (filter === 'pending') return p.pendency_status === 'pending';
    if (filter === 'complete') return p.pendency_status === 'complete';
    return true;
  });

  const pendingCount = pendencies.filter(p => p.pendency_status === 'pending').length;
  const completeCount = pendencies.filter(p => p.pendency_status === 'complete').length;

  return (
    <>
      <Header title="Pendências" onMenuToggle={() => {}} />
      <div className="app-content">
        {/* Stats */}
        <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'all' ? '2px solid var(--primary)' : undefined }}
            onClick={() => setFilter('all')}>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--text)' }}>{pendencies.length}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Total de eventos</div>
          </div>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'pending' ? '2px solid var(--warning)' : undefined }}
            onClick={() => setFilter('pending')}>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--warning)' }}>{pendingCount}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>⚠️ Com pendências</div>
          </div>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'complete' ? '2px solid var(--success)' : undefined }}
            onClick={() => setFilter('complete')}>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--success)' }}>{completeCount}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>✅ Completos</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-title">Tudo organizado!</div>
            <div className="empty-state-description">Não há pendências no momento.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filtered.map(p => (
              <Link href={`/eventos/${p.event_id}`} key={p.event_id} style={{ textDecoration: 'none' }}>
                <div className={`pendency-card ${p.pendency_status}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text)' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        📅 {formatDateShort(p.date)} — {formatTime(p.start_time)} • {p.event_type}
                      </div>
                    </div>
                    <span className={`badge ${p.pendency_status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                      {p.pendency_status === 'complete' ? '🟢 Completo' : '🟡 Pendente'}
                    </span>
                  </div>

                  <div className="pendency-checklist">
                    <div className={`pendency-item ${p.has_preacher ? 'done' : 'missing'}`}>
                      {p.has_preacher ? '✅' : '❌'} Pregador
                    </div>
                    <div className={`pendency-item ${p.has_worship_leader ? 'done' : 'missing'}`}>
                      {p.has_worship_leader ? '✅' : '❌'} Louvor
                    </div>
                    <div className={`pendency-item ${p.has_sound ? 'done' : 'missing'}`}>
                      {p.has_sound ? '✅' : '❌'} Sonoplastia
                    </div>
                    <div className={`pendency-item ${p.has_deaconry ? 'done' : 'missing'}`}>
                      {p.has_deaconry ? '✅' : '❌'} Diaconato
                    </div>
                    <div className={`pendency-item ${p.has_responsible ? 'done' : 'missing'}`}>
                      {p.has_responsible ? '✅' : '❌'} Responsável
                    </div>
                    <div className={`pendency-item ${p.has_location ? 'done' : 'missing'}`}>
                      {p.has_location ? '✅' : '❌'} Local
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
