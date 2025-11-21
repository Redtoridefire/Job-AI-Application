// Icon generator script - run with Node.js to create placeholder icons
// npm install canvas (if you want to generate icons programmatically)

const fs = require('fs');

// For now, we'll create SVG icons that can be converted to PNG
const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad1)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="${size * 0.5}" 
        font-weight="bold" fill="white">🎯</text>
</svg>`;
};

// Create icons directory if it doesn't exist
if (!fs.existsSync('./icons')) {
  fs.mkdirSync('./icons');
}

// Create SVG icons
fs.writeFileSync('./icons/icon16.svg', createSVGIcon(16));
fs.writeFileSync('./icons/icon48.svg', createSVGIcon(48));
fs.writeFileSync('./icons/icon128.svg', createSVGIcon(128));

console.log('SVG icons created! Convert them to PNG using an online tool or ImageMagick:');
console.log('convert icon.svg icon.png');
