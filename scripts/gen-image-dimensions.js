// Regenerates data/imageDimensions.json from the files in public/images.
// Run after adding or replacing product images:  node scripts/gen-image-dimensions.js
//
// next/image needs intrinsic dimensions to reserve layout space, and our image
// paths come from data/products.js as strings, so static imports aren't an option.

const fs = require("fs");
const path = require("path");

const IMAGES_DIR = path.join(__dirname, "..", "public", "images");
const OUT_FILE = path.join(__dirname, "..", "data", "imageDimensions.json");

// Minimal header parsers — avoids pulling in an image library for a build script.
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buf.length - 9) {
    if (buf[offset] !== 0xff) return null; // desynced from the segment chain
    const marker = buf[offset + 1];
    // 0xff is fill padding; d0-d7 (RST), d8 (SOI), 01 (TEM) carry no length field.
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of header data
    // SOF0-SOF15, excluding DHT (c4), JPGA (c8) and DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

function gifSize(buf) {
  if (buf.length < 10 || buf.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const format = buf.toString("ascii", 12, 16);
  if (format === "VP8X") {
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    };
  }
  if (format === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (format === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

// Sniff by magic bytes, not extension: several files in public/images are
// WebP saved under .jpg and .png names.
function readSize(file) {
  const buf = fs.readFileSync(file);
  return pngSize(buf) || jpegSize(buf) || webpSize(buf) || gifSize(buf);
}

const dimensions = {};
const skipped = [];

for (const name of fs.readdirSync(IMAGES_DIR).sort()) {
  const full = path.join(IMAGES_DIR, name);
  if (!fs.statSync(full).isFile()) continue;
  let size = null;
  try {
    size = readSize(full);
  } catch (err) {
    skipped.push(`${name} (${err.message})`);
    continue;
  }
  if (!size || !size.width || !size.height) {
    skipped.push(name);
    continue;
  }
  dimensions[`/images/${name}`] = [size.width, size.height];
}

fs.writeFileSync(OUT_FILE, JSON.stringify(dimensions, null, 2) + "\n");

console.log(`Wrote ${Object.keys(dimensions).length} entries to data/imageDimensions.json`);
if (skipped.length) console.log(`Skipped (no readable dimensions): ${skipped.join(", ")}`);
