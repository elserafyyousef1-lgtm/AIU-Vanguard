// src/components/ui/Skeleton.tsx — shimmering loading placeholder.
import type { CSSProperties } from 'react'

export function Skeleton({ w = '100%', h = 16, radius, style }: { w?: number | string; h?: number | string; radius?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius ?? 'var(--r-sm)', ...style }} />
}

// Convenience: a stack of text-line skeletons.
export function SkeletonText({ lines = 3, style }: { lines?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={12} w={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
