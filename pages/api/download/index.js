// GET /api/download?token=xxx&format=pdf
//
// Validates the HMAC token, looks up the blob URL from env vars, generates
// a short-lived signed URL for private Vercel Blob files, and redirects.
//
// File URLs (base, no query string) stored as env vars after uploading:
//   DCIT_PDF_URL  — https://xxxx.private.blob.vercel-storage.com/DCIT_3rd_Edition_fillable.pdf
//   RSR_EPUB_URL, RSR_PDF_URL
//
// Also requires BLOB_READ_WRITE_TOKEN (auto-added by Vercel when store was created).

import { issueSignedToken, presignUrl } from "@vercel/blob";
import { verifyDownloadToken } from "../../../lib/downloadToken";

// Maps product slug + format → env var name holding the blob URL.
const FILE_ENV = {
  "dont-call-it-that":         { pdf: "DCIT_PDF_URL" },
  "dont-call-it-that-digital": { pdf: "DCIT_PDF_URL" },
  "run-studio-run":            { epub: "RSR_EPUB_URL", pdf: "RSR_PDF_URL" },
  "run-studio-run-digital":    { epub: "RSR_EPUB_URL", pdf: "RSR_PDF_URL" },
};

export default async function handler(req, res) {
  const { token, format } = req.query;

  if (!token || !format) {
    return res.status(400).send("Missing token or format.");
  }

  const data = verifyDownloadToken(token);
  if (!data) {
    return res.status(403).send("This download link has expired or is invalid. Please contact nopicnicpress@gmail.com for a new link.");
  }

  const formats = FILE_ENV[data.slug];
  if (!formats || !formats[format]) {
    return res.status(404).send("Format not available for this product.");
  }

  const fileUrl = process.env[formats[format]];
  if (!fileUrl) {
    return res.status(503).send("Files are being prepared. Please check back shortly or contact nopicnicpress@gmail.com.");
  }

  // For private Vercel Blob URLs, generate a short-lived signed URL.
  // Public blob URLs are redirected directly.
  if (fileUrl.includes(".private.blob.vercel-storage.com")) {
    try {
      const pathname = new URL(fileUrl).pathname;
      const validUntil = Date.now() + 60 * 60 * 1000; // 1 hour
      const signedToken = await issueSignedToken({
        pathname,
        operations: ["get"],
        validUntil,
      });
      const { presignedUrl } = await presignUrl(signedToken, {
        pathname,
        operation: "get",
      });
      return res.redirect(302, presignedUrl);
    } catch (err) {
      console.error("Blob presign error:", err);
      return res.status(500).send("Could not generate download link. Please contact nopicnicpress@gmail.com.");
    }
  }

  res.redirect(302, fileUrl);
}
