import { verifyReviewToken } from "../../lib/reviewToken";

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — No Picnic Press</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 80px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    p  { font-size: 14px; line-height: 1.7; color: #555; }
    a  { color: #1a6e3c; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

async function commitReview(review) {
  const { author, product, rating, text } = review;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghToken = process.env.GITHUB_TOKEN_NPP;

  if (!repo || !ghToken) throw new Error("GITHUB_REPO or GITHUB_TOKEN not configured");

  const apiBase = `https://api.github.com/repos/${repo}/contents/data/products.js`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Get current file
  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
  const sha = fileData.sha;

  // Build the new review entry
  const reviewEntry = `  {
    text: ${JSON.stringify(text)},
    author: ${JSON.stringify(author)},
    product: ${JSON.stringify(product)},
    rating: ${rating},
  },`;

  // Insert before the closing ]; of the reviews array
  const reviewsStart = currentContent.indexOf("export const reviews = [");
  if (reviewsStart === -1) throw new Error("Could not find reviews array in products.js");
  const closingBracket = currentContent.indexOf("\n];", reviewsStart);
  if (closingBracket === -1) throw new Error("Could not find end of reviews array");

  const newContent =
    currentContent.slice(0, closingBracket) +
    "\n" + reviewEntry +
    currentContent.slice(closingBracket);

  // Commit
  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Add review from ${author} for "${product}"`,
      content: Buffer.from(newContent).toString("base64"),
      sha,
      branch,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub PUT failed: ${putRes.status} — ${err.message}`);
  }
}

export default async function handler(req, res) {
  const { action, token } = req.query;

  if (!token) {
    return res.status(400).send(htmlPage("Invalid link", "<h1>Invalid link</h1><p>This link is missing a token.</p>"));
  }

  const review = verifyReviewToken(token);

  if (!review) {
    return res.status(400).send(
      htmlPage("Link expired", "<h1>Link expired</h1><p>Review approval links expire after 7 days. The review was not published.</p>")
    );
  }

  if (action === "reject") {
    return res.status(200).send(
      htmlPage("Review declined", `<h1>Review declined</h1><p>The review from ${review.author} was not published.</p>`)
    );
  }

  if (action === "approve") {
    try {
      await commitReview(review);
      return res.status(200).send(
        htmlPage(
          "Review published",
          `<h1>Review published</h1>
          <p>${review.author}'s review of <em>${review.product}</em> has been committed to the repo. Vercel will deploy it in about 30 seconds.</p>
          <p><a href="https://nopicnicpress.com">View the site</a></p>`
        )
      );
    } catch (err) {
      console.error("Review commit error:", err);
      return res.status(500).send(
        htmlPage(
          "Error",
          `<h1>Something went wrong</h1><p>${err.message}</p><p>The review was not published. Check Vercel logs.</p>`
        )
      );
    }
  }

  return res.status(400).send(htmlPage("Bad request", "<h1>Bad request</h1><p>Unknown action.</p>"));
}
