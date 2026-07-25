// 38 images were WebP or PNG saved under .jpg/.png names, so they were served
// with a Content-Type that didn't match their bytes — which is what broke
// Facebook link previews. They've been renamed to their real extension; these
// keep the old URLs alive for anything that already linked to them.
const legacyImageRedirects = require("./data/legacyImageRedirects.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async redirects() {
    return [
      // Both policies live on one page. Ad platforms and payment processors ask
      // for a URL that is specifically a privacy policy, so keep these pointing in.
      { source: "/privacy", destination: "/policies#privacy", permanent: true },
      { source: "/privacy-policy", destination: "/policies#privacy", permanent: true },
      { source: "/terms", destination: "/policies#terms", permanent: true },
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
      ...Object.entries(legacyImageRedirects).map(([source, destination]) => ({
        source,
        destination,
        permanent: true,
      })),
    ];
  },
};

module.exports = nextConfig;
