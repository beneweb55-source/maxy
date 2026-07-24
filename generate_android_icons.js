const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const densities = [
  { name: 'mipmap-mdpi', size: 48, adaptiveSize: 108 },
  { name: 'mipmap-hdpi', size: 72, adaptiveSize: 162 },
  { name: 'mipmap-xhdpi', size: 96, adaptiveSize: 216 },
  { name: 'mipmap-xxhdpi', size: 144, adaptiveSize: 324 },
  { name: 'mipmap-xxxhdpi', size: 192, adaptiveSize: 432 },
];

async function generate() {
  const iconPath = 'assets/icon-android.png';
  const resDir = path.join('android', 'app', 'src', 'main', 'res');

  const { data } = await sharp(iconPath)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };

  for (const d of densities) {
    const dir = path.join(resDir, d.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. ic_launcher_background.png
    await sharp({ create: { width: d.adaptiveSize, height: d.adaptiveSize, channels: 4, background: bg } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    // 2. ic_launcher_foreground.png (scaled to 65%)
    const fgSize = Math.round(d.adaptiveSize * 0.65);
    await sharp(iconPath)
      .resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.floor((d.adaptiveSize - fgSize) / 2),
        bottom: Math.ceil((d.adaptiveSize - fgSize) / 2),
        left: Math.floor((d.adaptiveSize - fgSize) / 2),
        right: Math.ceil((d.adaptiveSize - fgSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    // 3. ic_launcher.png (legacy icon)
    const bgBuffer = await sharp({ create: { width: d.size, height: d.size, channels: 4, background: bg } }).png().toBuffer();
    const fgBuffer = await sharp(iconPath)
        .resize(Math.round(d.size * 0.9), Math.round(d.size * 0.9), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
    await sharp(bgBuffer)
      .composite([{ input: fgBuffer, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
      
    // 4. ic_launcher_round.png
    const circleSvg = `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size/2}" cy="${d.size/2}" r="${d.size/2}" /></svg>`;
    const squareIcon = await sharp(bgBuffer).composite([{ input: fgBuffer, gravity: 'center' }]).png().toBuffer();
    await sharp(squareIcon)
      .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`Generated for ${d.name}`);
  }
}

generate().catch(console.error);
