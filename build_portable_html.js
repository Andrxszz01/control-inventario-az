const fs = require('fs');
const path = require('path');

const targets = [
  'Control de Inventario AZ.html',
  'MANUAL.html',
  'GUIA_GENERIC_TEXT.html',
  'REQUISITOS.html'
];

const mimeByExt = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function toDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeByExt[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

function inlineImagesInHtml(htmlPath) {
  const absHtml = path.resolve(htmlPath);
  const htmlDir = path.dirname(absHtml);
  let html = fs.readFileSync(absHtml, 'utf8');

  html = html.replace(/<img([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>/gi, (full, before, src, after) => {
    if (/^(https?:|data:|file:|\/\/)/i.test(src)) {
      return full;
    }

    const decodedSrc = decodeURIComponent(src.replace(/\\/g, '/'));
    const imagePath = path.resolve(htmlDir, decodedSrc);

    if (!fs.existsSync(imagePath)) {
      return full;
    }

    try {
      const dataUri = toDataUri(imagePath);
      return `<img${before} src="${dataUri}"${after}>`;
    } catch {
      return full;
    }
  });

  const outPath = absHtml.replace(/\.html$/i, '_portable.html');
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  const out = inlineImagesInHtml(target);
  console.log(`Generated: ${out}`);
}
