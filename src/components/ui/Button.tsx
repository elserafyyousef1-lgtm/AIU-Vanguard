'use client'
// src/components/ui/Button.tsx — Vanguard primitive button.
// Variants: primary (crimson + shimmer) · ghost (glass) · subtle (surface) · danger.
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = { primary: 'btn-primary', ghost: 'btn-ghost', subtle: 'btn-subtle', danger: 'btn-danger' }
const SIZE: Record<Size, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  href?: string
  children?: ReactNode
}

export function Button({
  variant = 'primary', size = 'md', icon, iconRight, loading = false,
  fullWidth = false, href, children, className = '', disabled, style, ...rest
}: Props) {
  const cls = `${VARIANT[variant]} ${SIZE[size]} ${className}`.trim()
  const st: CSSProperties = { ...(fullWidth ? { width: '100%' } : null), ...style }
  const inner = (
    <>
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
      {iconRight}
    </>
  )
  if (href && !disabled && !loading) {
    return <Link href={href} className={cls} style={st}>{inner}</Link>
  }
  return <button className={cls} style={st} disabled={disabled || loading} {...rest}>{inner}</button>
}
