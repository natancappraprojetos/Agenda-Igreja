const sharp = require('sharp');
const fs = require('fs');

async function run() {
  const input = 'src/app/icon.png';
  const output = 'src/app/icon_temp.png';
  
  const metadata = await sharp(input).metadata();
  const width = metadata.width || 512;
  const height = metadata.height || 512;
  const rx = Math.floor(width * 0.25); // 25% border radius
  
  const svgMask = `
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="white" />
    </svg>
  `;
  
  await sharp(input)
    .composite([{ input: Buffer.from(svgMask), blend: 'dest-in' }])
    .toFile(output);
    
  fs.copyFileSync(output, input);
  fs.unlinkSync(output);
  console.log('Done!');
}
run();
