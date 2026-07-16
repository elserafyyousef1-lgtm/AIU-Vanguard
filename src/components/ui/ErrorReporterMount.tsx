'use client'
// src/components/ui/ErrorReporterMount.tsx — installs the global error reporter
// (window error + unhandledrejection → public.app_errors) once per page load.
import { useEffect } from 'react'
import { installErrorReporter } from '@/lib/errorReporter'

export function ErrorReporterMount() {
  useEffect(() => { installErrorReporter() }, [])
  return null
}
