'use client'
// src/components/ai/AIPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CSE221_AI_PROMPT } from '@/lib/data/cse221'
import { MAT312_AI_PROMPT } from '@/lib/data/mat312'
import { AIE121_AI_PROMPT } from '@/lib/data/aie121'
import { buildSystemPrompt } from '@/lib/data/aiPersona'
import { COURSES } from '@/lib/data/courses'
import type { AIMessage } from '@/types'

interface Props {
  courseSlug: string
  onClose: () => void
  quickChips?: string[]
}

const MAX_HISTORY = 20

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
  const [showChips, setShowChips] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [usePro, setUsePro] = useState(false)            // false = free (Gemini), true = pro (Claude)
  const [limitHit, setLimitHit] = useState(false)        // free limit reached → offer upgrade
  const [lastQuestion, setLastQuestion] = useState('')   // resend this when upgrading
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

  // Persist the conversation for this session (cleared when the site is closed)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(messages))
      }
    } catch {
      // storage full or unavailable — fail silently
    }
  }, [messages, storageKey])

  // If there is already a conversation, don't show the starter chips
  useEffect(() => {
    if (messages.length > 0) setShowChips(false)
  }, [])

  const sendMessage = async (text: string, forcePro?: boolean) => {
    if (!text.trim() || isTyping) return
    setShowChips(false)
    setLimitHit(false)

    const pro = forcePro ?? usePro
    const userMsg: AIMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    const newMsgs = [...messages, userMsg].slice(-MAX_HISTORY)
    setMessages(newMsgs)
    setInput('')
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
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Free tier limit reached → offer to upgrade to Claude (don't show a raw error)
        if (!pro && res.status === 429) {
          setLimitHit(true)
          return
        }
        // Pro tier limit reached → fall back to free so work doesn't stop
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
          {
            role: 'assistant',
            content: data.error || 'Something went wrong. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ])
        return
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.', timestamp: new Date().toISOString() },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // Student tapped "switch to advanced AI" → turn on pro and resend the same question
  const upgradeToPro = () => {
    setLimitHit(false)
    setUsePro(true)
    if (lastQuestion) {
      sendMessage(lastQuestion, true)
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
            {messages.length > 0 && (
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
                whiteSpace:'pre-wrap', wordBreak:'break-word',
              }}>
                {msg.content}
              </div>
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
        <div style={{
          padding:'12px 16px',
          borderTop:'1px solid var(--br)',
          display:'flex', gap:8, alignItems:'flex-end',
          flexShrink:0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
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
            disabled={!input.trim() || isTyping}
            style={{
              width:40, height:40, borderRadius:11, flexShrink:0,
              background: input.trim() && !isTyping
                ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                : 'var(--s3)',
              border:'none', cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
              color: input.trim() && !isTyping ? 'white' : 'var(--t3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
          ><Send size={15} /></button>
        </div>
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