/* Generates app icons + splash screens for the native projects using jimp
   (no native deps). Star mark on a sky-blue field, matching the web app.
   Re-run after `npx cap add` regenerates native folders. */
import { Jimp } from "jimp";
import { readdirSync, existsSync, writeFileSync } from "fs";

const SKY = "#0ea5e9";
const CREAM = "#f5f5f4";
const hex = (h) => {
  h = h.replace("#", "");
  if (h.length === 6) h += "ff";
  return parseInt(h, 16) >>> 0;
};

/* point-in-5-point-star test */
function inStar(px, py, cx, cy, outerR, innerR) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  let inside = false;
  for (let i = 0, j = 9; i < 10; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* a crisp, tightly-framed star on transparent bg (points touch the edges) */
function starLayer(color) {
  const S = 1000;
  const img = new Jimp({ width: S, height: S, color: 0x00000000 });
  const cx = S / 2, cy = S / 2, outerR = (S / 2) * 0.99, innerR = outerR * 0.42;
  const c = hex(color);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (inStar(x + 0.5, y + 0.5, cx, cy, outerR, innerR)) img.setPixelColor(c, x, y);
  return img;
}

const WHITE = starLayer("#ffffff");
const SKYSTAR = starLayer(SKY);

/* compose a w×h canvas: optional bg fill + a centered star of pixel radius R */
function canvas(w, h, bg, layer, R) {
  const img = new Jimp({ width: w, height: h, color: bg ? hex(bg) : 0x00000000 });
  const d = Math.round(2 * R);
  const s = layer.clone().resize({ w: d, h: d });
  img.composite(s, Math.round(w / 2 - R), Math.round(h / 2 - R));
  return img;
}
function roundMask(img) {
  const { width: w, height: h, data } = img.bitmap;
  const cx = w / 2, cy = h / 2, r = w / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) data[(y * w + x) * 4 + 3] = 0;
    }
  return img;
}
const dimsOf = async (p) => { const i = await Jimp.read(p); return [i.bitmap.width, i.bitmap.height]; };

const RES = "android/app/src/main/res";
let count = 0;

/* iOS app icon (opaque, 1024) */
if (existsSync("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")) {
  const p = "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
  await canvas(1024, 1024, SKY, WHITE, 1024 * 0.34).write(p); count++;
}
/* iOS splash */
if (existsSync("ios/App/App/Assets.xcassets/Splash.imageset")) {
  for (const f of readdirSync("ios/App/App/Assets.xcassets/Splash.imageset")) {
    if (!f.endsWith(".png")) continue;
    const p = `ios/App/App/Assets.xcassets/Splash.imageset/${f}`;
    const [w, h] = await dimsOf(p);
    await canvas(w, h, CREAM, SKYSTAR, Math.min(w, h) * 0.09).write(p); count++;
  }
}
/* Android launcher icons per density */
if (existsSync(RES)) {
  for (const d of readdirSync(RES)) {
    if (!d.startsWith("mipmap-") || d.includes("anydpi")) continue;
    const dir = `${RES}/${d}`;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".png")) continue;
      const p = `${dir}/${f}`;
      const [w, h] = await dimsOf(p);
      if (f.includes("foreground")) await canvas(w, h, null, WHITE, w * 0.24).write(p);
      else if (f.includes("round")) await roundMask(canvas(w, h, SKY, WHITE, w * 0.34)).write(p);
      else await canvas(w, h, SKY, WHITE, w * 0.34).write(p);
      count++;
    }
  }
  /* Android splash screens in every drawable density folder */
  for (const d of readdirSync(RES)) {
    if (!d.startsWith("drawable")) continue;
    const p = `${RES}/${d}/splash.png`;
    if (!existsSync(p)) continue;
    const [w, h] = await dimsOf(p);
    await canvas(w, h, CREAM, SKYSTAR, Math.min(w, h) * 0.09).write(p); count++;
  }
  /* adaptive icon background color -> sky */
  const bgXml = `${RES}/values/ic_launcher_background.xml`;
  if (existsSync(bgXml))
    writeFileSync(
      bgXml,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0EA5E9</color>\n</resources>\n`
    );
}
console.log(`generated ${count} image files`);
