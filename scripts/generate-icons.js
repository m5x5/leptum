#!/usr/bin/env node

/**
 * Script to generate favicon and PWA icons from SVG
 * 
 * This script uses sharp to convert the SVG icon to various PNG sizes needed for PWA.
 * 
 * Install sharp if needed: npm install --save-dev sharp
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed. Install it with: npm install --save-dev sharp');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error(`Error: SVG icon not found at ${svgPath}`);
  process.exit(1);
}

async function generateIcons() {
  const sizes = [
    { size: 32, name: 'favicon.ico' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ];

  for (const { size, name } of sizes) {
    const outputPath = path.join(publicDir, name);
    
    try {
      if (name === 'favicon.ico') {
        // Generate PNG first, then convert to ICO
        const pngBuffer = await sharp(svgPath)
          .resize(size, size)
          .png()
          .toBuffer();
        
        // For ICO, we'll create a simple PNG-based ICO
        // Most browsers accept PNG files named .ico
        await sharp(pngBuffer)
          .resize(size, size)
          .png()
          .toFile(outputPath);
      } else {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(outputPath);
      }
      
    } catch (error) {
      console.error(`Error generating ${name}:`, error.message);
    }
  }
}

generateIcons().catch(console.error);
