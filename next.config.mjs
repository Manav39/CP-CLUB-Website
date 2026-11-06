/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'leetcode.com',
      },
      {
        protocol: 'https',
        hostname: 'www.codechef.com',
      },
      {
        protocol: 'https',
        hostname: 'atcoder.jp',
      },
      {
        protocol: 'https',
        hostname: 'sta.codeforces.com',
      },
      {
        protocol: 'https',
        hostname: 'codeforces.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'img.atcoder.jp',
      },
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
      }
    ],
  },
};

export default nextConfig;
