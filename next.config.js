/** @type {import('next').NextConfig} */

// Security response headers applied to every route. Kept conservative so nothing breaks:
//   • clickjacking is shut down two ways (X-Frame-Options + CSP frame-ancestors 'none')
//   • MIME sniffing off (nosniff) — matters because users upload files
//   • CSP intentionally does NOT restrict script/style/connect sources (Next injects inline
//     scripts and we load Google Fonts + Supabase + Gemini); locking those needs nonces and
//     would break the app. We only lock the directives that are safe and high-value here.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
