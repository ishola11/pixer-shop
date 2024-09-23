/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

// Log environment variables to verify they're being passed
if (process.env.NEXT_PUBLIC_REST_API_ENDPOINT) {
  console.log('NEXT_PUBLIC_REST_API_ENDPOINT is set');
} else {
  console.log('NEXT_PUBLIC_REST_API_ENDPOINT is NOT set');
}

if (process.env.NEXT_PUBLIC_WEBSITE_URL) {
  console.log('NEXT_PUBLIC_WEBSITE_URL is set');
} else {
  console.log('NEXT_PUBLIC_WEBSITE_URL is NOT set');
}

if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set');
} else {
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is NOT set');
}

module.exports = {
  reactStrictMode: true,
  i18n,
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      '127.0.0.1:8000',
      'maps.googleapis.com',
      's3.amazonaws.com',
      'pixarlaravel.s3.ap-southeast-1.amazonaws.com',
      'pickbazarlaravel.s3.ap-southeast-1.amazonaws.com',
    ],
  },
  ...(process.env.APPLICATION_MODE === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
};
