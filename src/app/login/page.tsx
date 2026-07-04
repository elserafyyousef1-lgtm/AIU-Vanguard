'use client'
// src/app/login/page.tsx
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  // After login you land on YOUR dashboard (like any site) unless a protected page sent you here.
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    studentId: '',
    fullName: '',
    email: '',
    password: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'register') {
        // Validate the student ID looks like an AIU ID (8 digits)
        const id = form.studentId.trim()
        if (!/^\d{8}$/.test(id)) {
          toast.error(' The student ID must be 8 digits.')
          setLoading(false)
          return
        }
        if (form.fullName.trim().length < 3) {
          toast.error(' Please enter your full name.')
          setLoading(false)
          return
        }

        const email = `${id.toLowerCase()}@aiu.edu.eg`
        const { error } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: {
              student_id: id,
              full_name: form.fullName.trim(),
            },
          },
        })

        if (error) {
          // Friendly, specific messages
          const msg = error.message.toLowerCase()
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            toast.error(' This ID is already registered. Try logging in instead.')
          } else if (msg.includes('password')) {
            toast.error('  Password must be at least 6 characters.')
          } else {
            toast.error(' Could not register. Please try again.')
          }
          setLoading(false)
          return
        }

        toast.success(' Account created!')
        // HARD navigation after auth: guarantees the fresh session cookie reaches the
        // server render and kills the push()/refresh() race that swallowed the first click.
        window.location.assign(redirect)
        return
      } else {
        const raw = form.email.trim()
        if (!raw) {
          toast.error('Please enter your student ID.')
          setLoading(false)
          return
        }
        const email = raw.includes('@') ? raw : `${raw.toLowerCase()}@aiu.edu.eg`
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        })

        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('invalid') || msg.includes('credentials')) {
            toast.error(' Wrong student ID or password. Please check and try again.')
          } else if (msg.includes('confirm')) {
            toast.error('Account needs activation. Contact admin.')
          } else {
            toast.error('Could not sign you in. Please try again.')
          }
          setLoading(false)
          return
        }

        toast.success('أهلاً بعودتك! — Welcome back!')
        // HARD navigation after auth (same rationale as the register branch above).
        window.location.assign(redirect)
        return
      }
    } catch {
      toast.error(' — Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100dvh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:20,
      background:'var(--bg)',
    }}>
      {/* Back link */}
      <Link href="/" style={{
        position:'fixed', top:20, left:20,
        display:'flex', alignItems:'center', gap:6,
        color:'var(--t3)', textDecoration:'none', fontSize:13,
      }}>← Back</Link>

      <div style={{
        width:'min(420px,100%)',
        background:'var(--s2)',
        border:'1px solid var(--br)',
        borderRadius:24, padding:'36px 32px',
        animation:'scaleIn 0.3s var(--ease-spring)',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:52, height:52, borderRadius:14,
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 14px', fontWeight:800, fontSize:18, color:'white',
          }}>AIU</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--t)', letterSpacing:'-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color:'var(--t2)', fontSize:13.5, marginTop:6 }}>
            {mode === 'login'
              ? 'Sign in with your student ID'
              : 'Register with your AIU student ID'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display:'flex', gap:4,
          background:'var(--s3)', border:'1px solid var(--br)',
          borderRadius:12, padding:4, marginBottom:24,
        }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex:1, padding:'8px', borderRadius:9, fontSize:13, fontWeight:600,
                background: mode === m ? 'var(--s4)' : 'transparent',
                border: mode === m ? '1px solid var(--br2)' : '1px solid transparent',
                color: mode === m ? 'var(--t)' : 'var(--t2)',
                cursor:'pointer', transition:'all 0.15s',
                fontFamily:'var(--font)',
              }}
            >{m === 'login' ? 'Login' : 'Register'}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Student ID */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Student ID
            </label>
            <input
              type="text"
              value={form.studentId}
              onChange={e => setForm(f => ({ ...f, studentId: e.target.value, email: e.target.value }))}
              placeholder="e.g. 221XXXXX"
              required
              style={{
                width:'100%', padding:'10px 14px', borderRadius:10,
                background:'var(--s3)', border:'1px solid var(--br)',
                color:'var(--t)', fontSize:14, fontFamily:'var(--font)',
                outline:'none', boxSizing:'border-box',
                transition:'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--br)'}
            />
          </div>

          {/* Full name (register only) */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Your full name"
                required
                style={{
                  width:'100%', padding:'10px 14px', borderRadius:10,
                  background:'var(--s3)', border:'1px solid var(--br)',
                  color:'var(--t)', fontSize:14, fontFamily:'var(--font)',
                  outline:'none', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--br)'}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Password
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                required
                minLength={6}
                style={{
                  width:'100%', padding:'10px 40px 10px 14px', borderRadius:10,
                  background:'var(--s3)', border:'1px solid var(--br)',
                  color:'var(--t)', fontSize:14, fontFamily:'var(--font)',
                  outline:'none', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--br)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'var(--t3)',
                  cursor:'pointer', padding:4, display:'flex', alignItems:'center',
                }}
              >{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%', padding:'13px', borderRadius:12, marginTop:4,
              background: loading ? 'var(--s3)' : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color: loading ? 'var(--t3)' : 'white',
              border:'none', fontSize:15, fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'var(--font)', letterSpacing:'-0.01em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(224,38,75,0.35)',
              transition:'all 0.2s',
            }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> :
             mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* ── OR: Google (optional path — new Google users set their student ID once, right after) ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'18px 0 14px' }}>
          <span style={{ flex:1, height:1, background:'var(--br)' }} />
          <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em' }}>OR</span>
          <span style={{ flex:1, height:1, background:'var(--br)' }} />
        </div>
        <button
          type="button"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
            })
            if (error) toast.error('Google sign-in is not available right now.')
          }}
          style={{
            width:'100%', padding:'12px', borderRadius:12,
            background:'var(--s3)', border:'1px solid var(--br2)',
            color:'var(--t)', fontSize:14, fontWeight:600, fontFamily:'var(--font)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.96 10.96 0 0012 1 11 11 0 002.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--t3)', marginTop:20 }}>
          {mode === 'login' ? "Don't have an account? " : "Already registered? "}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:12, fontWeight:600 }}
          >{mode === 'login' ? 'Register' : 'Login'}</button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}