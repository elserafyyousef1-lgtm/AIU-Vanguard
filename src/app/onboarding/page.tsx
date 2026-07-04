'use client'
// src/app/onboarding/page.tsx — one-time university-ID claim for OAuth (Google) users.
// Signup no longer requires the 8-digit student ID (Google can't supply it); this page
// collects it ONCE, validates (8 digits + unique via the set_my_student_id RPC), and only
// then lets the student continue. Users who already have an ID are sent straight through.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)

  // Gate: must be signed in; skip if the ID is already set.
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.assign('/login?redirect=/onboarding'); return }
      const { data: contact } = await supabase.rpc('my_contact')
      const sid = (Array.isArray(contact) ? contact[0] : contact)?.student_id
      if (sid) { window.location.assign('/dashboard'); return }
      setChecking(false)
    }
    check()
  }, [])

  const save = async () => {
    const id = studentId.trim()
    if (!/^\d{8}$/.test(id)) { toast.error('The student ID must be exactly 8 digits.'); return }
    setSaving(true)
    const { error } = await supabase.rpc('set_my_student_id', { p_student_id: id })
    setSaving(false)
    if (error) {
      const msg = error.message || ''
      if (/already registered/i.test(msg)) toast.error('This student ID is already registered to another account.')
      else if (/already set/i.test(msg)) { window.location.assign('/dashboard'); return }
      else if (/8 digits/i.test(msg)) toast.error('The student ID must be exactly 8 digits.')
      else toast.error('Could not save your ID. Please try again.')
      return
    }
    toast.success('Welcome aboard! 🎓')
    window.location.assign('/dashboard')
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--t3)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{
        width: 'min(420px,100%)', background: 'var(--s2)', border: '1px solid var(--accent-br)',
        borderRadius: 24, padding: '36px 32px', animation: 'scaleIn 0.3s var(--ease-spring)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', color: 'white', boxShadow: 'var(--shadow-crimson)',
          }}><GraduationCap size={24} /></div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--t)', letterSpacing: '-0.02em' }}>
            One last step
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
            Enter your AIU student ID to link your account.<br />You only do this once.
          </p>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
          Student ID
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={studentId}
          onChange={e => setStudentId(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
          placeholder="e.g. 221XXXXX"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
            background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)',
            fontSize: 16, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--br)'}
        />
        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 8 }}>8 digits — the number on your university card.</p>

        <button
          onClick={save}
          disabled={saving || studentId.length !== 8}
          style={{
            width: '100%', padding: 13, borderRadius: 12, marginTop: 18,
            background: (saving || studentId.length !== 8) ? 'var(--s3)' : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: (saving || studentId.length !== 8) ? 'var(--t3)' : 'white',
            border: 'none', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
            cursor: (saving || studentId.length !== 8) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
