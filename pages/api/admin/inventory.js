import { checkAdminAuth } from "../../../lib/adminAuth";
import { products } from "../../../data/products";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    return res.status(200).json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        productWeightOz: p.productWeightOz,
        inStock: p.inStock,
        limited: p.limited || false,
        isDigital: p.isDigital || false,
        isService: p.isService || false,
        stripePriceId: p.stripePriceId || "",
        slug: p.slug,
      })),
    });
  }

  if (req.method === "POST") {
    const { productId, inStock } = req.body || {};
    if (!productId || typeof inStock !== "boolean") {
      return res.status(400).json({ error: "productId and inStock (boolean) required" });
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    try {
      await commitInventoryChange(productId, inStock);
      return res.status(200).json({ ok: true, message: "Stock update committed. Site redeploys in ~30s." });
    } catch (err) {
      console.error("Inventory commit error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}

async function commitInventoryChange(productId, inStock) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghToken = process.env.GITHUB_TOKEN_NPP;

  if (!repo || !ghToken) {
    throw new Error("GITHUB_REPO or GITHUB_TOKEN_NPP not configured");
  }

  const apiBase = `https://api.github.com/repos/${repo}/contents/data/products.js`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
  const sha = fileData.sha;

  // Find the product block by its id field, then update the nearest inStock field
  const idMarker = `id: "${productId}"`;
  const idIndex = currentContent.indexOf(idMarker);
  if (idIndex === -1) throw new Error(`Product "${productId}" not found in products.js`);

  // Find inStock after the product id marker
  const afterId = currentContent.slice(idIndex);
  const inStockMatch = afterId.match(/inStock: (?:true|false)/);
  if (!inStockMatch) throw new Error(`inStock field not found for "${productId}"`);

  const absoluteIndex = idIndex + afterId.indexOf(inStockMatch[0]);
  const newContent =
    currentContent.slice(0, absoluteIndex) +
    `inStock: ${inStock}` +
    currentContent.slice(absoluteIndex + inStockMatch[0].length);

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Admin: set ${productId} inStock=${inStock}`,
      content: Buffer.from(newContent).toString("base64"),
      sha,
      branch,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub commit failed: ${putRes.status} — ${err.message}`);
  }
}
