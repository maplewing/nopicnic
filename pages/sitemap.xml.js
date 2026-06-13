import { products } from "../data/products";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://nopicnicpress.com";

const staticPages = ["", "/about", "/stockists", "/shipping-returns"];

function generateSiteMap() {
  const productUrls = products
    .filter((p) => p.inStock && !p.isService)
    .map((p) => `  <url><loc>${SITE_URL}/shop/${p.slug}</loc></url>`);

  const staticUrls = staticPages.map(
    (path) => `  <url><loc>${SITE_URL}${path}</loc></url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...productUrls].join("\n")}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  res.setHeader("Content-Type", "text/xml");
  res.write(generateSiteMap());
  res.end();
  return { props: {} };
}

export default function SiteMap() {}
