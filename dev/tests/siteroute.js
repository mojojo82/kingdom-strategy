/* v1499: headless tests serve the TEST page for the site address, and real files (art/test assets, fonts, sounds) from the repo for anything
   with a file extension - since the v1498 art split the page loads its art as separate files (test/assets/...). Serving the 20 MB page for each
   of those used to crash Chromium. Usage: await ctx.route(/mojojo82\.github\.io/, require(".../siteroute.js")(GAME)); */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const TYPES = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", mp4: "video/mp4", json: "application/json", woff: "font/woff", woff2: "font/woff2", mp3: "audio/mpeg", ogg: "audio/ogg", webmanifest: "application/manifest+json", js: "application/javascript", css: "text/css" };
module.exports = (GAME) => (r) => {
  const p = decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\/kingdom-strategy\//, ""), ext = (p.match(/\.([a-z0-9]+)$/i) || [])[1];
  if (ext && ext.toLowerCase() !== "html") { const f = path.join(ROOT, p); if (f.startsWith(ROOT) && fs.existsSync(f)) return r.fulfill({ status: 200, contentType: TYPES[ext.toLowerCase()] || "application/octet-stream", body: fs.readFileSync(f) }); return r.fulfill({ status: 404, body: "" }); }
  return r.fulfill({ status: 200, contentType: "text/html", body: GAME });
};
