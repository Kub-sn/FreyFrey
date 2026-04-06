import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const logoPath = path.join(projectRoot, 'public', 'freyLogo.svg');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const iconBackground = '#FBF4EC';

const iconSpecs = [
  { folder: 'mipmap-mdpi', iconSize: 48, foregroundSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, foregroundSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, foregroundSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, foregroundSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, foregroundSize: 432 },
];

function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function renderMarkup({ size, logoUrl, shape, scale, background }) {
  const logoSize = Math.round(size * scale);
  const surfaceStyles = [
    'width: 100%;',
    'height: 100%;',
    'display: grid;',
    'place-items: center;',
    'overflow: hidden;',
  ];

  if (background) {
    surfaceStyles.push(`background: ${background};`);
  }

  if (shape === 'round') {
    surfaceStyles.push('border-radius: 50%;');
  }

  return `<!doctype html>
<html lang="de">
  <body style="margin:0; width:${size}px; height:${size}px; background:transparent;">
    <div id="surface" style="${surfaceStyles.join(' ')}">
      <img
        src="${logoUrl}"
        alt=""
        style="width:${logoSize}px; height:${logoSize}px; object-fit:contain; display:block;"
      />
    </div>
  </body>
</html>`;
}

async function renderPng(page, outputPath, options) {
  const size = options.size;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(renderMarkup(options));
  await page.waitForFunction(() => {
    const image = document.querySelector('img');

    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
  await page.screenshot({
    path: outputPath,
    omitBackground: true,
  });
}

async function main() {
  const svg = await readFile(logoPath, 'utf8');
  const logoUrl = svgToDataUrl(svg);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const spec of iconSpecs) {
      const folderPath = path.join(resDir, spec.folder);

      await renderPng(page, path.join(folderPath, 'ic_launcher.png'), {
        size: spec.iconSize,
        logoUrl,
        shape: 'square',
        scale: 0.72,
        background: iconBackground,
      });

      await renderPng(page, path.join(folderPath, 'ic_launcher_round.png'), {
        size: spec.iconSize,
        logoUrl,
        shape: 'round',
        scale: 0.68,
        background: iconBackground,
      });

      await renderPng(page, path.join(folderPath, 'ic_launcher_foreground.png'), {
        size: spec.foregroundSize,
        logoUrl,
        shape: 'square',
        scale: 0.62,
      });
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Android launcher icons could not be generated.');
  console.error(error);
  process.exitCode = 1;
});