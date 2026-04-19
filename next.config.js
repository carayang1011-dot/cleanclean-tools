// Fix for Windows EISDIR bug: readlink on regular files returns EISDIR instead of EINVAL
// Patch fs.readlink so webpack's enhanced-resolve handles it correctly
const originalReadlink = require('fs').readlink
require('fs').readlink = function patchedReadlink(path, options, callback) {
  if (typeof options === 'function') { callback = options; options = {} }
  originalReadlink(path, options, function (err, linkString) {
    if (err && err.code === 'EISDIR') {
      const newErr = Object.assign(new Error(`EINVAL: invalid argument, readlink '${path}'`), { code: 'EINVAL' })
      return callback(newErr)
    }
    callback(err, linkString)
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
