// GET /api/download?token=xxx&format=pdf
//
// Validates the HMAC token, looks up the blob URL from env vars, then
// fetches the file server-side (private blobs require auth) and streams
// it directly to the browser.
//
// File URLs (base, no query string) stored as env vars after uploading:
//   DCIT_PDF_URL  — https://xxxx.private.blob.vercel-storage.com/DCIT_3rd_Edition_fillable.pdf
//   RSR_EPUB_URL, RSR_PDF_URL
//
// Also requires BLOB_READ_WRITE_TOKEN (auto-added by Vercel when store was created).

import { verifyDownloadToken } from "../../../lib/downloadToken";

// Maps product slug + format → env var name holding the blob URL.
const FILE_ENV = {
  "dont-call-it-that":         { pdf: "DCIT_PDF_URL" },
  "dont-call-it-that-digital": { pdf: "DCIT_PDF_URL" },
  "run-studio-run":            { epub: "RSR_EPUB_URL", pdf: "RSR_PDF_URL" },
  "run-studio-run-digital":    { epub: "RSR_EPUB_URL", pdf: "RSR_PDF_URL" },
};

const CONTENT_TYPES = {
  pdf:  "application/pdf",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
};

export default async function handler(req, res) {
  const { token, format } = req.query;

  if (!token || !format) {
    return res.status(400).send("Missing token or format.");
  }

  const data = verifyDownloadToken(token);
  if (!data) {
    return res.status(403).send("This download link has expired or is invalid. Please contact hi@nopicnicpress.com for a new link.");
  }

  const formats = FILE_ENV[data.slug];
  if (!formats || !formats[format]) {
    return res.status(404).send("Format not available for this product.");
  }

  const fileUrl = process.env[formats[format]];
  if (!fileUrl) {
    return res.status(503).send("Files are being prepared. Please check back shortly or contact hi@nopicnicpress.com.");
  }

  // Private Vercel Blob URLs are not publicly reachable — fetch server-side
  // using the read/write token and stream the bytes to the client.
  try {
    const fetchOptions = fileUrl.includes(".private.blob.vercel-storage.com")
      ? { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } }
      : {};

    const upstream = await fetch(fileUrl, fetchOptions);
    if (!upstream.ok) {
      console.error("Blob fetch failed:", upstream.status, fileUrl);
      return res.status(500).send("Could not generate download link. Please contact hi@nopicnicpress.com.");
    }

    const filename = decodeURIComponent(fileUrl.split("/").pop() || `download.${format}`);
    res.setHeader("Content-Type", CONTENT_TYPES[format] || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const length = upstream.headers.get("content-length");
    if (length) res.setHeader("Content-Length", length);

    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).send("Could not generate download link. Please contact hi@nopicnicpress.com.");
  }
}
