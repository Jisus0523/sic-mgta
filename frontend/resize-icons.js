import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(publicDir, 'logo.png');

const sizes = [192, 512];

async function resizeLogos() {
  console.log('Generando iconos PWA...');
  if (!fs.existsSync(logoPath)) {
    console.error('No se encontró logo.png en public/');
    return;
  }

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent
      })
      .toFile(outputPath);
    console.log(`✅ Creado icon-${size}x${size}.png`);
  }
}

resizeLogos().catch(console.error);
