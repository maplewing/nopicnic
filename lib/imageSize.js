import dimensions from "../data/imageDimensions.json";

// Intrinsic size for a /images/... path, or null if the file predates the
// manifest. Regenerate with: node scripts/gen-image-dimensions.js
export function imageSize(src) {
  const d = dimensions[src];
  return d ? { width: d[0], height: d[1] } : null;
}
