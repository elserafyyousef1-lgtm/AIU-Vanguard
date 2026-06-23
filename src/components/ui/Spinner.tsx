// src/components/ui/Spinner.tsx — centred loading spinner with optional label.
import { Loader2 } from 'lucide-react'

export function Spinner({ size = 18, label, padding = 40 }: { size?: number; label?: string; padding?: number | string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--t3)', padding }}>
      <Loader2 size={size} className="animate-spin" />
      {label && <span style={{ fontSize: 13.5 }}>{label}</span>}
    </div>
  )
}
