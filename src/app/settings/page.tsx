'use client'
// src/app/settings/page.tsx — Account settings (name, nickname, contact info)
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { Loader2, User, Phone, Mail, AtSign, Save } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/settings'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('full_name, nickname')
        .eq('id', user.id)
        .single()
      setFullName(data?.full_name || '')
      setNickname(data?.nickname || '')
      // Contact info lives in the locked user_private table — read via secure RPC.
      const { data: contact } = await supabase.rpc('my_contact')
      const c = Array.isArray(contact) ? contact[0] : contact
      setPhone(c?.phone || '')
      setContactEmail(c?.contact_email || '')
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    if (!userId) return
    const name = fullName.trim()
    if (name.length < 3) { toast.error('Please enter your full name.'); return }
    const nick = nickname.trim()
    if (nick && (nick.length > 20 || !/^[a-zA-Z0-9_ .\u0600-\u06FF-]+$/.test(nick))) {
      toast.error('Nickname: up to 20 letters, numbers or _ . -'); return
    }
    const ph = phone.trim()
    if (ph && !/^\+?[0-9\s-]{7,15}$/.test(ph)) { toast.error('Please enter a valid phone number.'); return }
    const em = contactEmail.trim()
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast.error('Please enter a valid email.'); return }

    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: name,
      nickname: nick || null,
    }).eq('id', userId)
    // Contact info is written to the locked user_private table via secure RPC.
    const { error: contactErr } = await supabase.rpc('update_my_contact', { p_phone: ph, p_contact_email: em })
    setSaving(false)
    if (error || contactErr) { toast.error('Could not save. Please try again.'); return }
    toast.success('Settings saved.')
  }

  const field = (label: string, icon: any, value: string, set: (v: string) => void, placeholder: string, hint?: string) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
        {icon} {label}
      </label>
      <input
        value={value}
        onChange={e => set(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--s3)', border: '1px solid var(--br)',
          borderRadius: 12, padding: '11px 14px', color: 'var(--t)',
          fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
        }}
      />
      {hint && <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>{hint}</p>}
    </div>
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--t3)' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 48px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--t)', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 26 }}>Manage your account information.</p>

        <section style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t)', marginBottom: 18 }}>Profile</h2>
          {field('Full name', <User size={13} />, fullName, setFullName, 'Your full name')}
          {field('Nickname', <AtSign size={13} />, nickname, setNickname, 'e.g. The Survivor', 'Shown subtly under your name on your profile. Optional.')}
        </section>

        <section style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22, marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t)', marginBottom: 6 }}>Contact</h2>
          <p style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 18 }}>Private — visible only to you.</p>
          {field('Phone', <Phone size={13} />, phone, setPhone, '+20 1X XXX XXXX')}
          {field('Email', <Mail size={13} />, contactEmail, setContactEmail, 'you@gmail.com')}
        </section>

        <button
          onClick={save}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px',
            borderRadius: 12, background: 'var(--accent)', color: 'white',
            border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes</button>
      </main>
    </div>
  )
}
