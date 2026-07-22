'use client'
// src/components/ai/AIPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Copy, Check, MessageSquare, Target, FileText, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QuizView } from './QuizView'
import { ExamView } from './ExamView'
import { CSE221_AI_PROMPT } from '@/lib/data/cse221'
import { MAT312_AI_PROMPT } from '@/lib/data/mat312'
import { AIE121_AI_PROMPT } from '@/lib/data/aie121'
import { buildSystemPrompt } from '@/lib/data/aiPersona'
import { COURSES } from '@/lib/data/courses'
import type { AIMessage, AISource } from '@/types'
import { RichText } from './RichText'

// Decode the base64 (UTF-8) X-Sources header the streaming route sends → citation list.
function decodeSources(header: string | null): AISource[] | undefined {
  if (!header) return undefined
  try {
    const bytes = Uint8Array.from(atob(header), c => c.charCodeAt(0))
    const arr = JSON.parse(new TextDecoder().decode(bytes))
    return Array.isArray(arr) ? arr : undefined
  } catch {
    return undefined
  }
}

interface Props {
  courseSlug: string
  onClose: () => void
  quickChips?: string[]
}

const MAX_HISTORY = 20

// Study-companion follow-ups shown under the latest answer — turns the tutor from a
// chatbot into an active study partner. Bilingual prompts so the reply matches the student.
const STUDY_ACTIONS: { label: string; prompt: string }[] = [
  { label: '🔁 Simpler', prompt: 'اشرح اللي فات ده تاني بطريقة أبسط خطوة بخطوة. / Explain that again, more simply, step by step.' },
  { label: '📝 Example', prompt: 'اديني مثال محلول بالكامل على النقطة دي بكل الخطوات. / Give me one fully worked example on this, showing every step.' },
  { label: '🎯 Quiz me', prompt: 'اسألني سؤال واحد بأسلوب الامتحان على الموضوع ده، واستنى إجابتي قبل ما تكشف الحل. / Ask me ONE exam-style question on this topic and wait for my answer before revealing the solution.' },
  { label: '⚠️ Exam trap', prompt: 'إيه أكتر غلطة أو فخ بيقع فيه الطلبة في الموضوع ده في الامتحان وإزاي أتجنبه؟ / What is the most common mistake or exam trap on this topic, and how do I avoid it?' },
  { label: '📅 Study plan', prompt: 'اعملي خطة مذاكرة مرتّبة بالأولوية للمادة دي: ركّز على نقط ضعفي وأهم المواضيع للامتحان من مواد المادة، واقسمها لخطوات واضحة. / Build me a prioritized study plan for this course: focus on my weak areas and the most exam-relevant topics from the course materials, broken into clear steps.' },
]

export function AIPanel({ courseSlug, onClose, quickChips = [] }: Props) {
  // Session storage key — unique per course, cleared when the site is fully closed
  const storageKey = `vanguard-ai-chat-${courseSlug}`

  const [messages, setMessages] = useState<AIMessage[]>(() => {
    // Restore the conversation if the student reopens the panel in the same session
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(storageKey)
        if (saved) return JSON.parse(saved) as AIMessage[]
      } catch {
        // ignore corrupted data
      }
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)  // stays the lock for the WHOLE stream
  const [showChips, setShowChips] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [mode, setMode] = useState<'chat' | 'quiz' | 'exam'>('chat')  // chat = tutor, quiz = MCQ drill, exam = full mock exam
  const [usePro, setUsePro] = useState(false)            // false = free (Gemini), true = pro (Claude)
  const [limitHit, setLimitHit] = useState(false)        // free limit reached → offer upgrade
  const [lastQuestion, setLastQuestion] = useState('')   // resend this when upgrading
  const [imgData, setImgData] = useState<{ mime: string; b64: string; url: string } | null>(null)  // attached image (Vision)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const courseKnowledge = courseSlug === 'CSE221' ? CSE221_AI_PROMPT
    : courseSlug === 'AIE121' ? AIE121_AI_PROMPT
    : courseSlug === 'MAT312' ? MAT312_AI_PROMPT
    : `This is a course at Alamein International University. Provide clean step-by-step help with worked examples.`

  const courseInfo = COURSES[courseSlug]
  const systemPrompt = buildSystemPrompt(courseKnowledge, {
    courseCode: courseInfo?.code,
    courseName: courseInfo?.title,
    instructor: courseInfo?.instructor,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Persist the conversation for this session (cleared when the site is closed).
  // Strip attached image data URLs — they're large (megabytes of base64) and would blow the
  // sessionStorage quota, which would stop the WHOLE transcript from persisting.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (messages.length > 0) {
        const slim = messages.map(({ image, ...m }) => m)
        sessionStorage.setItem(storageKey, JSON.stringify(slim))
      }
    } catch {
      // storage full or unavailable — fail silently
    }
  }, [messages, storageKey])

  // If there is already a conversation, don't show the starter chips
  useEffect(() => {
    if (messages.length > 0) setShowChips(false)
  }, [])

  const sendMessage = async (text: string, forcePro?: boolean, reuseLast?: boolean) => {
    const img = reuseLast ? null : imgData
    if ((!text.trim() && !img) || isTyping || isStreaming) return
    setShowChips(false)
    setLimitHit(false)

    // An attached image always goes to the free Gemini (Vision) route — keep the pro flag in
    // sync with the actual endpoint so error handling matches.
    const pro = (forcePro ?? usePro) && !img
    // reuseLast: resend the existing last user turn (used when upgrading to Pro after the
    // free limit) — do NOT append a second, duplicate user bubble.
    const userMsg: AIMessage = { role: 'user', content: text, timestamp: new Date().toISOString(), image: img?.url }
    const newMsgs = (reuseLast ? [...messages] : [...messages, userMsg]).slice(-MAX_HISTORY)
    setMessages(newMsgs)
    setInput('')
    setImgData(null)
    // Snap the auto-grown textarea back to one row (clearing value doesn't fire onInput).
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLastQuestion(text)
    setIsTyping(true)

    try {
      // Talk to OUR secure server route — free (Gemini) or pro (Claude).
      // The API keys stay hidden on the server.
      const endpoint = pro ? '/api/ai-tutor-pro' : '/api/ai-tutor'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          courseSlug,
          image: img ? { mimeType: img.mime, data: img.b64 } : undefined,
        }),
      })

      // Errors come back as JSON (rate limit, config, etc.) BEFORE any stream starts.
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any))
        if (!pro && res.status === 429) { setLimitHit(true); return }
        if (pro && (res.status === 429 || data.error === 'limit_reached')) {
          setUsePro(false)
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'The advanced AI has reached its limit for now. I\'ve switched you back to the free tutor so you can keep going. The owner has been notified.',
              timestamp: new Date().toISOString(),
            },
          ])
          notifyOwnerProLimit()
          return
        }
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.error || 'Something went wrong. Please try again.', timestamp: new Date().toISOString() },
        ])
        return
      }

      const ctype = res.headers.get('content-type') || ''
      if (ctype.includes('application/json')) {
        // Non-streaming route (e.g. the pro tutor) — one reply.
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, sources: data.sources, grounded: data.grounded, timestamp: new Date().toISOString() }])
      } else if (res.body) {
        // Streaming — the answer types in word-by-word as it arrives.
        // Grounding sources + honesty signal ride in headers, ready before the first token.
        const sources = decodeSources(res.headers.get('X-Sources'))
        const grounded = (res.headers.get('X-Grounded') || undefined) as AIMessage['grounded']
        // Swap the typing dots for a live bubble, but keep isStreaming engaged as the lock
        // for the ENTIRE stream — the send guard, button, and follow-up chips all respect it,
        // so no second send can fire mid-stream and scramble `copy[copy.length-1]`.
        setIsTyping(false)
        setIsStreaming(true)
        setMessages(prev => [...prev, { role: 'assistant', content: '', sources, grounded, timestamp: new Date().toISOString() }])
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc }
            return copy
          })
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.', timestamp: new Date().toISOString() },
      ])
    } finally {
      setIsTyping(false)
      setIsStreaming(false)
    }
  }

  // Student tapped "switch to advanced AI" → turn on pro and resend the same question
  const upgradeToPro = () => {
    setLimitHit(false)
    setUsePro(true)
    if (lastQuestion) {
      // reuseLast=true: the question is already the last user bubble — resend without duplicating it.
      sendMessage(lastQuestion, true, true)
    }
  }

  // Notify the owner that the paid AI limit was reached (best-effort)
  const notifyOwnerProLimit = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      // find the owner
      const { data: owner } = await supabase
        .from('profiles').select('id').eq('role', 'owner').limit(1).single()
      if (owner && user) {
        await supabase.from('notifications').insert({
          user_id: owner.id,
          actor_id: user.id,
          type: 'message',
        })
      }
    } catch { /* best effort */ }
  }

  // Attach an image the tutor can "see" and solve (Vision). Read as a data URL and keep both
  // the full URL (for preview/display) and the raw base64 (for the API).
  const pickImage = (file: File | null) => {
    if (!file) { setImgData(null); return }
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || '')
      const comma = url.indexOf(',')
      if (comma < 0) return
      setImgData({ mime: file.type, b64: url.slice(comma + 1), url })
    }
    reader.readAsDataURL(file)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', alignItems:'flex-end', justifyContent:'flex-end',
      padding:20, pointerEvents:'none',
    }}>
      <div style={{
        width:'min(420px, calc(100vw - 40px))',
        height:'min(600px, calc(100dvh - 100px))',
        background:'var(--s2)',
        border:'1px solid var(--accent-br)',
        borderRadius:20,
        display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
        animation:'scaleIn 0.2s var(--ease-spring) both',
        pointerEvents:'all',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px',
          borderBottom:'1px solid var(--br)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0,
          background:'linear-gradient(135deg, rgba(224,38,75,0.06), rgba(139,92,246,0.04))',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:9,
              background:'linear-gradient(135deg, rgba(224,38,75,0.2), rgba(139,92,246,0.2))',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--accent)',
            }}>
              <Sparkles size={15} />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--t)', display:'flex', alignItems:'center', gap:7 }}>
                Vanguard AI ✦
                {usePro && (
                  <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.05em',
                    padding:'2px 7px', borderRadius:6,
                    background:'var(--accent)', color:'white',
                  }}>PRO</span>
                )}
              </div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>
                {courseSlug} · Arabic & English
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {mode === 'chat' && messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([])
                  setShowChips(true)
                  try { sessionStorage.removeItem(storageKey) } catch {}
                }}
                title="Start a new chat"
                style={{
                  height:30, padding:'0 10px', borderRadius:8,
                  background:'var(--s3)', border:'none',
                  color:'var(--t2)', cursor:'pointer', fontSize:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >New</button>
            )}
            <button
              onClick={onClose}
              style={{
                width:30, height:30, borderRadius:8,
                background:'var(--s3)', border:'none',
                color:'var(--t2)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
            ><X size={14} /></button>
          </div>
        </div>

        {/* Chat / Quiz toggle */}
        <div style={{
          display:'flex', gap:4, padding:'8px 16px 0', flexShrink:0,
        }}>
          {([
            { key:'chat', label:'Chat', icon:<MessageSquare size={13} /> },
            { key:'quiz', label:'Quiz me', icon:<Target size={13} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              style={{
                flex:1, padding:'7px', borderRadius:9, cursor:'pointer', fontFamily:'var(--font)',
                fontSize:12, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                background: mode === t.key ? 'var(--s3)' : 'transparent',
                color: mode === t.key ? 'var(--t)' : 'var(--t3)',
                border:'1px solid ' + (mode === t.key ? 'var(--br)' : 'transparent'),
                transition:'all 0.12s',
              }}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {mode === 'quiz' ? (
          <QuizView courseSlug={courseSlug} courseName={courseInfo?.title} onExit={() => setMode('chat')} onStartExam={() => setMode('exam')} />
        ) : mode === 'exam' ? (
          <ExamView courseSlug={courseSlug} courseName={courseInfo?.title} onExit={() => setMode('chat')} />
        ) : (
        <>
        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t3)', fontSize:13 }}>
              <div style={{ fontSize:28, marginBottom:10 }}>✦</div>
              اسأل أي سؤال بالعربي أو الإنجليزي
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display:'flex', flexDirection:'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap:4,
            }}>
              <div style={{
                maxWidth:'85%',
                padding:'10px 14px', borderRadius:14,
                borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 14,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : 'var(--s3)',
                border: msg.role === 'assistant' ? '1px solid var(--br)' : 'none',
                color: msg.role === 'user' ? 'white' : 'var(--t)',
                fontSize:13.5, lineHeight:1.6,
                whiteSpace: msg.role === 'assistant' ? 'normal' : 'pre-wrap', wordBreak:'break-word',
              }}>
                {msg.image && (
                  <img src={msg.image} alt="attachment" style={{ maxWidth:'100%', maxHeight:200, borderRadius:10, display:'block', marginBottom: msg.content ? 8 : 0 }} />
                )}
                {msg.role === 'assistant' ? <RichText content={msg.content} /> : msg.content}
              </div>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:1, maxWidth:'85%' }}>
                  {msg.sources.map((s, si) => {
                    // Deep-link straight to the source PDF at the exact page (#page=N) when we have
                    // its URL — tap "from Lecture4.pdf · p.7" and land on that slide inside the app.
                    const href = s.url ? `${s.url}${s.page ? `#page=${s.page}` : ''}` : null
                    const label = `${s.title}${s.page ? ` · p.${s.page}` : ''}`
                    const inner = (
                      <>
                        <FileText size={10} style={{ flexShrink:0 }} />
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
                      </>
                    )
                    const chipStyle: React.CSSProperties = {
                      display:'inline-flex', alignItems:'center', gap:4,
                      fontSize:10.5, color:'var(--t3)', textDecoration:'none',
                      background:'var(--s2)', border:'1px solid var(--br)',
                      borderRadius:7, padding:'2px 7px', maxWidth:'100%',
                    }
                    return href ? (
                      <a key={si} href={href} target="_blank" rel="noopener noreferrer"
                         title={`Open ${s.title}${s.page ? ` at page ${s.page}` : ''}`} style={{ ...chipStyle, cursor:'pointer' }}>
                        {inner}
                      </a>
                    ) : (
                      <span key={si} title={s.page ? `${s.title} · page ${s.page}` : s.title} style={chipStyle}>
                        {inner}
                      </span>
                    )
                  })}
                </div>
              )}
              {/* Honesty signal: this answer wasn't found in the course's materials (which DO exist). */}
              {msg.role === 'assistant' && msg.grounded === 'ungrounded' && (
                <div
                  title="This answer isn't from your uploaded course materials — double-check against your slides."
                  style={{
                    display:'inline-flex', alignItems:'center', gap:4, marginTop:1, maxWidth:'85%',
                    fontSize:10.5, color:'#d9a441',
                    background:'rgba(217,164,65,0.10)', border:'1px solid rgba(217,164,65,0.28)',
                    borderRadius:7, padding:'2px 8px',
                  }}
                >
                  <Sparkles size={10} style={{ flexShrink:0 }} />
                  <span>معلومة عامة — مش من مواد المادة</span>
                </div>
              )}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content)
                    setCopiedIndex(i)
                    setTimeout(() => setCopiedIndex(null), 1500)
                  }}
                  title="Copy"
                  style={{
                    display:'flex', alignItems:'center', gap:4,
                    background:'transparent', border:'none', cursor:'pointer',
                    color:'var(--t3)', fontSize:11, padding:'2px 4px',
                  }}
                >
                  {copiedIndex === i
                    ? (<><Check size={12} /> Copied</>)
                    : (<><Copy size={12} /> Copy</>)}
                </button>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display:'flex', justifyContent:'flex-start' }}>
              <div style={{
                padding:'10px 14px', borderRadius:14, borderBottomLeftRadius:4,
                background:'var(--s3)', border:'1px solid var(--br)',
                display:'flex', gap:4, alignItems:'center',
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:6, height:6, borderRadius:'50%',
                    background:'var(--t3)',
                    animation:`bounce 1s ${i*0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Free limit reached → offer the advanced AI */}
          {limitHit && (
            <div style={{
              padding:'14px 16px', borderRadius:14,
              background:'var(--s3)', border:'1px solid var(--accent)',
              display:'flex', flexDirection:'column', gap:10,
            }}>
              <div style={{ fontSize:13.5, color:'var(--t)', lineHeight:1.5 }}>
                The free tutor has reached its limit for now. You can continue with Vanguard AI Pro — a more advanced tutor — right here, keeping the same conversation.
              </div>
              <button
                onClick={upgradeToPro}
                style={{
                  alignSelf:'flex-start', padding:'8px 16px', borderRadius:10,
                  background:'var(--accent)', color:'white', border:'none',
                  fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)',
                  display:'flex', alignItems:'center', gap:7,
                }}
              >
                <Sparkles size={14} /> Continue with Vanguard AI Pro
              </button>
            </div>
          )}

          {/* Study-companion follow-ups under the latest answer */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isTyping && !isStreaming && !limitHit && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {STUDY_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.prompt)}
                  style={{
                    padding: '5px 11px', borderRadius: 20,
                    background: 'var(--s3)', border: '1px solid var(--br)',
                    color: 'var(--t2)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >{a.label}</button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        {showChips && quickChips.length > 0 && (
          <div style={{
            padding:'0 16px 10px',
            display:'flex', flexWrap:'wrap', gap:6,
          }}>
            {quickChips.slice(0, 4).map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{
                  padding:'5px 12px', borderRadius:20,
                  background:'var(--s3)', border:'1px solid var(--br)',
                  color:'var(--t2)', fontSize:11.5, cursor:'pointer',
                  fontFamily:'var(--font)', transition:'all 0.12s',
                }}
              >{chip}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ borderTop:'1px solid var(--br)', flexShrink:0 }}>
          {imgData && (
            <div style={{ padding:'10px 16px 0' }}>
              <div style={{ position:'relative', display:'inline-block' }}>
                <img src={imgData.url} alt="" style={{ maxHeight:72, borderRadius:8, border:'1px solid var(--br)', display:'block' }} />
                <button
                  onClick={() => setImgData(null)}
                  title="Remove image"
                  style={{ position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:'50%', background:'var(--s1)', border:'1px solid var(--br)', color:'var(--t2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                ><X size={12} /></button>
              </div>
            </div>
          )}
          <div style={{ padding:'12px 16px', display:'flex', gap:8, alignItems:'flex-end' }}>
            <label
              title="Attach an image (photograph a problem)"
              style={{ width:40, height:40, borderRadius:11, flexShrink:0, cursor:'pointer', background:'var(--s3)', border:'1px solid var(--br)', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center' }}
            >
              <ImageIcon size={16} />
              <input type="file" accept="image/*" onChange={e => { pickImage(e.target.files?.[0] || null); e.currentTarget.value = '' }} style={{ display:'none' }} />
            </label>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px' }}
              placeholder="اسأل سؤال... / Ask a question..."
              rows={1}
              style={{
                flex:1, padding:'10px 14px', borderRadius:12,
                background:'var(--s3)', border:'1px solid var(--br)',
                color:'var(--t)', fontSize:13, fontFamily:'var(--font)',
                resize:'none', outline:'none',
                maxHeight:100, overflowY:'auto',
                lineHeight:1.5,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !imgData) || isTyping || isStreaming}
              style={{
                width:40, height:40, borderRadius:11, flexShrink:0,
                background: (input.trim() || imgData) && !isTyping && !isStreaming
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : 'var(--s3)',
                border:'none', cursor: (input.trim() || imgData) && !isTyping && !isStreaming ? 'pointer' : 'not-allowed',
                color: (input.trim() || imgData) && !isTyping && !isStreaming ? 'white' : 'var(--t3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.15s',
              }}
            ><Send size={15} /></button>
          </div>
        </div>
        </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}