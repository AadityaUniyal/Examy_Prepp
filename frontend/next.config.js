/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
      },
      {
        source: '/api/upload-syllabus',
        destination: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/upload-syllabus',
      },
    ]
  },
}

module.exports = nextConfig
