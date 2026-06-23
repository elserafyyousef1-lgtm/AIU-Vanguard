'use client'
// src/components/course/TeachRequests.tsx — owner/admin approve or reject teach requests
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { GraduationCap, Check, X } from 'lucide-react'

interface Req {
  id: string; status: string; created_at: string
  doctor: { full_name: string } | null
  course: { code: string; title: string } | null
}

export function TeachRequests() {
  const supabase = createClient()
  const [reqs, setReqs] = useState<Req[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('teach_requests')
      .select('id, status, created_at, doctor:doctor_id (full_name), course:course_id (code, title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setReqs((data as any) || [])
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('teach_requests')
      .update({ status, decided_by: user?.id })
      .eq('id', id)
    setBusy(null)
    if (error) { toast.error('Could not save the decision.'); return }
    toast.success(status === 'approved' ? 'Approved — course assigned to the doctor.' : 'Request rejected.')
    load()
  }

  if (reqs.length === 0) return null

  return (
    <section style={{ background: 'var(--s2)', border: '1px solid #f59e0b55', borderRadius: 16, padding: 20, marginBottom: 26 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--t)', marginBottom: 14 }}>
        <GraduationCap size={16} style={{ color: '#f59e0b' }} /> Teach Requests ({reqs.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {reqs.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: '11px 14px', borderRadius: 11, background: 'var(--s3)', border: '1px solid var(--br)',
          }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t)' }}>{r.doctor?.full_name || 'Doctor'}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                wants to teach <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.course?.code}</span> — {r.course?.title}
              </div>
            </div>
            <button onClick={() => decide(r.id, 'approved')} disabled={busy === r.id} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9,
              background: '#10b981', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
            }}><Check size={13} /> Approve</button>
            <button onClick={() => decide(r.id, 'rejected')} disabled={busy === r.id} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9,
              background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}><X size={13} /> Reject</button>
          </div>
        ))}
      </div>
    </section>
  )
}
