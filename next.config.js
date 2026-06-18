/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async redirects() {
    return [
      // Old Squarespace shop index → new homepage
      { source: "/shop", destination: "/", permanent: true },
      // Old Squarespace product URLs → new /shop/[slug] paths
      { source: "/dont-call-it-that", destination: "/shop/dont-call-it-that", permanent: true },
      { source: "/run-studio-run", destination: "/shop/run-studio-run", permanent: true },
      { source: "/go-name-yourself", destination: "/shop/go-name-yourself", permanent: true },
      { source: "/assorted-characters", destination: "/shop/assorted-characters", permanent: true },
      { source: "/name-right-now-bundle", destination: "/shop/name-right-now-bundle", permanent: true },
      { source: "/dont-call-it-that-1", destination: "/shop/dont-call-it-that-1", permanent: true },
      { source: "/dont-call-it-that-2nd", destination: "/shop/dont-call-it-that-2nd-edition", permanent: true },
    ];
  },
};

module.exports = nextConfig;
