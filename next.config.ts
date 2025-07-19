import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
  },
  // Enable PWA optimizations
  swcMinify: true,
  // Optimize for production
  images: {
    domains: ['your-supabase-project.supabase.co'], // Add your Supabase domain if using images
  },
  // PWA settings
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ]
  },
}

export default nextConfig