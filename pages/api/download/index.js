// GET /api/download?token=xxx&format=epub
//
// Validates the HMAC token, looks up the file URL from env vars,
// and issues a 302 redirect so the browser downloads the file.
//
// File URLs are stored as env vars set after uploading to Vercel Blob (or any host):
//   DCIT_EPUB_URL, DCIT_PDF_URL, DCIT_MOBI_URL
//   RSR_EPUB_URL,  RSR_PDF_URL
//
// Upload files with:  npx vercel blob upload <file>
// Then add the returned URL to Vercel → Project → Environment Variables.

import { verifyDownloadToken } from "../../../lib/downloadToken";

// Maps product slug + format → env var name holding the file URL.
const FILE_ENV = {
  "dont-call-it-that":         { epub: "DCIT_EPUB_URL", pdf: "DCIT_PDF_URL", mobi: "DCIT_MOBI_URL" },
  "dont-call-it-that-digital": { epub: "DCIT_EPUB_URL", pdf: "DCIT_PDF_URL", mobi: "DCIT_MOBI_URL" },
  "run-studio-run":            { epub: "RSR_EPUB_URL",  pdf: "RSR_PDF_URL" },
  "run-studio-run-digital":    { epub: "RSR_EPUB_URL",  pdf: "RSR_PDF_URL" },
};

export default function handler(req, res) {
  const { token, format } = req.query;

  if (!token || !format) {
    return res.status(400).send("Missing token or format.");
  }

  const data = verifyDownloadToken(token);
  if (!data) {
    return res.status(403).send("This download link has expired or is invalid. Please contact hi@elialtman.com for a new link.");
  }

  const formats = FILE_ENV[data.slug];
  if (!formats || !formats[format]) {
    return res.status(404).send("Format not available for this product.");
  }

  const fileUrl = process.env[formats[format]];
  if (!fileUrl) {
    // Files not yet uploaded — send a friendly message instead of crashing.
    return res.status(503).send("Files are being prepared. Please check back shortly or contact hi@elialtman.com.");
  }

  // Redirect to the file. The browser will download it directly.
  res.redirect(302, fileUrl);
}
