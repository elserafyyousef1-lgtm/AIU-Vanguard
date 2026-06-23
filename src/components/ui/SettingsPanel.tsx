'use client'
// src/components/ui/SettingsPanel.tsx
import { useUIStore, useUserStore } from '@/lib/store'
import { X, Moon, Sun, Volume2, VolumeX, Zap, ZapOff, Bell, BellOff } from 'lucide-react'

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useUIStore()
  const { settings, updateSettings } = useUserStore()

  if (!settingsOpen) return null

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:500,
        background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20, animation:'fadeIn 0.2s',
      }}
      onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}
    >
      <div style={{
        width:'min(400px,100%)',
        background:'var(--s2)',
        border:'1px solid var(--br)',
        borderRadius:20, padding:28,
        animation:'scaleIn 0.25s var(--ease-spring)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h3 style={{ fontWeight:700, fontSize:18, color:'var(--t)' }}>Settings</h3>
          <button onClick={() => setSettingsOpen(false)} style={{
            width:30, height:30, borderRadius:8,
            background:'var(--s3)', border:'none', color:'var(--t2)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          }}><X size={14} /></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Theme */}
          <SettingRow
            label="Theme"
            desc={settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            icon={settings.theme === 'dark' ? Moon : Sun}
            active={settings.theme === 'dark'}
            onToggle={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          />
          {/* Notifications */}
          <SettingRow
            label="Notifications"
            desc="Sound alerts for new activity"
            icon={settings.notifications ? Bell : BellOff}
            active={settings.notifications}
            onToggle={() => updateSettings({ notifications: !settings.notifications })}
          />
          {/* Sound */}
          <SettingRow
            label="Sound"
            desc="Notification & UI sounds"
            icon={settings.sound ? Volume2 : VolumeX}
            active={settings.sound}
            onToggle={() => updateSettings({ sound: !settings.sound })}
          />
          {/* Animations */}
          <SettingRow
            label="Animations"
            desc="Page transitions & effects"
            icon={settings.animations ? Zap : ZapOff}
            active={settings.animations}
            onToggle={() => updateSettings({ animations: !settings.animations })}
          />

          {/* Language */}
          <div style={{
            padding:'14px 16px', borderRadius:12,
            background:'var(--s3)', border:'1px solid var(--br)',
          }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--t)', marginBottom:10 }}>AI Language</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['ar', 'en', 'both'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => updateSettings({ language: lang })}
                  style={{
                    padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500,
                    background: settings.language === lang ? 'var(--accent)' : 'var(--s4)',
                    color: settings.language === lang ? 'white' : 'var(--t2)',
                    border:`1px solid ${settings.language === lang ? 'var(--accent)' : 'var(--br)'}`,
                    cursor:'pointer', fontFamily:'var(--font)',
                  }}
                >{lang === 'ar' ? 'عربي' : lang === 'en' ? 'English' : 'Both'}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop:20, fontSize:11, color:'var(--t3)', textAlign:'center' }}>
          AIU CS Hub v2.0 · Built for Alamein International University
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, desc, icon: Icon, active, onToggle }: any) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px', borderRadius:12,
      background:'var(--s3)', border:'1px solid var(--br)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          background:'var(--s4)', display:'flex', alignItems:'center',
          justifyContent:'center', color:'var(--t2)',
        }}><Icon size={15} /></div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--t)' }}>{label}</div>
          <div style={{ fontSize:11, color:'var(--t3)' }}>{desc}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width:44, height:24, borderRadius:12,
          background: active ? 'var(--accent)' : 'var(--s4)',
          border:`1px solid ${active ? 'var(--accent)' : 'var(--br)'}`,
          cursor:'pointer', position:'relative',
          transition:'all 0.2s',
        }}
      >
        <div style={{
          position:'absolute', top:3,
          left: active ? 22 : 3,
          width:16, height:16, borderRadius:'50%',
          background:'white',
          transition:'left 0.2s var(--ease-spring)',
        }} />
      </button>
    </div>
  )
}
