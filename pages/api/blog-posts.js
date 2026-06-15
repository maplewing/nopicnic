export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const wpRes = await fetch(
      "https://www.ahundredmonkeys.com/wp-json/wp/v2/posts?per_page=50&orderby=date&order=desc&_embed=wp:featuredmedia",
      {
        headers: {
          Accept: "application/json, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://www.ahundredmonkeys.com/",
        },
      }
    );

    if (!wpRes.ok) {
      return res.status(502).json({ error: `Upstream ${wpRes.status}` });
    }

    const data = await wpRes.json();

    const decode = (str) =>
      (str || "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#8217;/g, "\u2019").replace(/&#8216;/g, "\u2018").replace(/&#8230;/g, "…");

    const posts = data.filter((p) => p.author === 5).map((p) => ({
      id: p.id,
      title: decode(p.title?.rendered || ""),
      excerpt: decode((p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").replace(/\[&hellip;\]/g, "…")).trim(),
      date: p.date,
      link: p.link,
      image: (() => {
        const src = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
        if (!src) return null;
        return src.startsWith("http") ? src : `https://www.ahundredmonkeys.com${src}`;
      })(),
    }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(posts);
  } catch (err) {
    console.error("blog-posts proxy error:", err.message);
    return res.status(502).json({ error: err.message });
  }
}
