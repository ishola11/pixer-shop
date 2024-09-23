/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

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
  env: {
    NEXT_PUBLIC_REST_API_ENDPOINT: process.env.NEXT_PUBLIC_REST_API_ENDPOINT,
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};
