// ------------------- server.js --------------------
import express from "express";
import { Catbox } from "node-catbox";

const app = express();
const catbox = new Catbox();

// ---------------- Helper Functions ----------------
function base64UrlDecodeToString(b64url) {
  if (!b64url) return "";
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binaryStr = Buffer.from(b64, "base64").toString("binary");
  return Buffer.from(binaryStr, "binary").toString("utf8");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ----------------- Upload Endpoint -----------------
app.post("/upload-base64", async (req, res) => {
  try {
    const { filename, mimeType, data } = req.body;

    console.log("📨 Upload request received:", {
      filename,
      mimeType,
      dataLength: data?.length,
    });

    if (!filename || !data) {
      console.log("❌ Missing filename or data");
      return res.status(400).json({ error: "Missing filename or data" });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(data, "base64");
    console.log("📊 Buffer size:", fileBuffer.length, "bytes");

    // Upload to Catbox
    console.log("🚀 Starting Catbox upload...");
    const url = await catbox.uploadFile({
      buffer: fileBuffer,
      filename: filename,
      contentType: mimeType || "application/octet-stream",
    });

    console.log("✅ Catbox upload successful:", url);
    return res.json({
      success: true,
      url: url,
      filename: filename,
    });
  } catch (error) {
    console.error("💥 Upload error:", error);
    return res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
});

// ---------------- Embed Endpoint ----------------
app.get("/embed", (req, res) => {
  const encodedText = req.query.text || "";
  const encodedImg = req.query.img || "";
  const color = req.query.color || "fc7ea4";
  const encodedTitle = req.query.title;
  const encodedSiteName = req.query.siteName;
  const avatarType = req.query.avatarType || "none";
  const avatarUrl = req.query.avatarUrl || "";
  const avatarWidth = req.query.avatarWidth || "";
  const avatarHeight = req.query.avatarHeight || "";

  const text = escapeHtml(base64UrlDecodeToString(encodedText) || "⠀");

  // Handle title - if empty string, no title; if undefined, use default
  let title = "";
  let showTitleMeta = true;

  if (encodedTitle === "") {
    // Empty title - no title
    showTitleMeta = false;
  } else if (encodedTitle) {
    // Custom title provided
    title = escapeHtml(base64UrlDecodeToString(encodedTitle));
  } else {
    // No title param - use default
    title = "〔 ͟𝀛͟𝀛͟╹͟⌵͟╹͟𝀛͟𝀛͟ 〕";
  }

  // Handle site name - if empty string, no site name; if undefined, use default
  let siteName = "";
  let showSiteNameMeta = true;

  if (encodedSiteName === "") {
    // Empty site name - no site name
    showSiteNameMeta = false;
  } else if (encodedSiteName) {
    // Custom site name provided
    siteName = escapeHtml(base64UrlDecodeToString(encodedSiteName));
  } else {
    // No site name param - use default
    siteName = "〔 ͟𝀛͟𝀛͟╹͟⌵͟╹͟𝀛͟𝀛͟ 〕";
  }

  const imgUrl = encodedImg
    ? escapeHtml(decodeURIComponent(encodedImg))
    : "https://files.catbox.moe/1f995e.webp";

  // Use custom avatar if provided and type is not "none"
  const finalImageUrl =
    avatarType !== "none" && avatarUrl ? decodeURIComponent(avatarUrl) : imgUrl;

  // Determine Twitter card type based on avatar type
  const twitterCardType =
    avatarType === "large" ? "summary_large_image" : "summary";

  // Build image size meta tags
  let imageSizeMeta = "";
  if (avatarType === "small") {
    const width = avatarWidth || "45";
    const height = avatarHeight || "45";
    imageSizeMeta = `
<meta property="og:image:width" content="${width}">
<meta property="og:image:height" content="${height}">`;
  } else if (avatarType === "large" && avatarWidth && avatarHeight) {
    imageSizeMeta = `
<meta property="og:image:width" content="${avatarWidth}">
<meta property="og:image:height" content="${avatarHeight}">`;
  }

  // Build title meta tag only if we want to show title
  const titleMeta = showTitleMeta
    ? `<meta property="og:title" content="${title}">`
    : "";

  // Build site name meta tag only if we want to show site name
  const siteNameMeta = showSiteNameMeta
    ? `<meta property="og:site_name" content="${siteName}">`
    : "";

  res.setHeader("Content-Type", "text/html");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
${titleMeta}
${siteNameMeta}
<meta property="og:description" content="${text}">
<meta property="og:image" content="${finalImageUrl}">
${imageSizeMeta}
<meta name="theme-color" content="#${color}">
<meta name="twitter:card" content="${twitterCardType}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || siteName || "Embed Preview"}</title>
<style>
body {
  font-family: sans-serif;
  background: #111;
  color: #fff;
  padding: 2em;
}
img {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin-top: 1em;
}
</style>
</head>
<body>
${title ? `<h1>${title}</h1>` : ""}
<p>${text}</p>
<img src="${finalImageUrl}" alt="Embed Image">
</body>
</html>`);
});

// ---------------- Start Server ----------------
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`🚀 Server running on http://localhost:${port}`)
);