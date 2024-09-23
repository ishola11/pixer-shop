/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const apiEndpoint = process.env.NEXT_PUBLIC_REST_API_ENDPOINT || 'https://default-api.com';
const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://default-website.com';
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_defaultKey';
const tokenKey = process.env.AUTH_TOKEN_KEY || 'AUTH_CRED';
const applicationMode = process.env.APPLICATION_MODE || 'production';
const defualtLanguage = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en';
const availableLanguages = process.env.NEXT_PUBLIC_AVAILABLE_LANGUAGES || 'en';
const multiLang = process.env.NEXT_PUBLIC_ENABLE_MULTI_LANG || 'false';


console.log('NEXT_PUBLIC_REST_API_ENDPOINT:', apiEndpoint);
console.log('NEXT_PUBLIC_WEBSITE_URL:', websiteUrl);
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', stripeKey);
console.log('AUTH_TOKEN_KEY:', tokenKey);
console.log('APPLICATION_MODE:', applicationMode);
console.log('NEXT_PUBLIC_DEFAULT_LANGUAGE:', defualtLanguage);
console.log('NEXT_PUBLIC_AVAILABLE_LANGUAGES:', availableLanguages);
console.log('NEXT_PUBLIC_ENABLE_MULTI_LANG:', multiLang);

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
