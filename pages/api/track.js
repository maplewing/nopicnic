// Analytics tracking disabled — using Vercel Analytics instead.
// Blob operations were exhausting the free tier quota.
export default function handler(req, res) {
  res.status(200).end();
}
