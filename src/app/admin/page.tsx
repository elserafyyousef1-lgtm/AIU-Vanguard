'use client'
// src/app/admin/page.tsx — retired in favor of the full control center.
// Anyone landing on /admin is sent to the comprehensive People & Roles page.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRedirectPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/people') }, [router])
  return null
}
