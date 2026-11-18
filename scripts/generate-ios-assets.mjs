import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const appIconDir = path.join(rootDir, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const splashDir = path.join(rootDir, 'ios/App/App/Assets.xcassets/Splash.imageset');
const svgPath = path.join(rootDir, 'public/logo labprox.svg');
const templateArchive = path.join(rootDir, 'node_modules/@capacitor/cli/assets/ios-pods-template.tar.gz');

if (!fs.existsSync(path.join(rootDir, 'ios/App/App'))) {
  console.log('[Labprox iOS] Pasta ios/App/App não encontrada — geração de assets iOS ignorada.');
  process.exit(0);
}

fs.mkdirSync(appIconDir, { recursive: true });
fs.mkdirSync(splashDir, { recursive: true });

const iconSizes = [
  { file: 'AppIcon-20.png', size: 20 },
  { file: 'AppIcon-20@2x.png', size: 40 },
  { file: 'AppIcon-20@3x.png', size: 60 },
  { file: 'AppIcon-29.png', size: 29 },
  { file: 'AppIcon-29@2x.png', size: 58 },
  { file: 'AppIcon-29@3x.png', size: 87 },
  { file: 'AppIcon-40.png', size: 40 },
  { file: 'AppIcon-40@2x.png', size: 80 },
  { file: 'AppIcon-40@3x.png', size: 120 },
  { file: 'AppIcon-60@2x.png', size: 120 },
  { file: 'AppIcon-60@3x.png', size: 180 },
  { file: 'AppIcon-76.png', size: 76 },
  { file: 'AppIcon-76@2x.png', size: 152 },
  { file: 'AppIcon-83.5@2x.png', size: 167 },
  { file: 'AppIcon-512@2x.png', size: 1024 },
];

const splashFiles = [
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png',
];

function generateWithMacSwift() {
  const swiftScript = `
import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let svgPath = CommandLine.arguments[1]
let appIconDir = CommandLine.arguments[2]
let splashDir = CommandLine.arguments[3]

guard let nsImage = NSImage(contentsOfFile: svgPath) else {
    fputs("Failed to load SVG via NSImage\\n", stderr)
    exit(1)
}

func saveOpaquePNG(size: Int, outPath: String, drawBlock: (CGContext, CGSize) -> Void) -> Bool {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue
    guard let ctx = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else { return false }

    let cgSize = CGSize(width: size, height: size)
    drawBlock(ctx, cgSize)

    guard let cgImage = ctx.makeImage() else { return false }
    let url = URL(fileURLWithPath: outPath) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else { return false }
    CGImageDestinationAddImage(dest, cgImage, nil)
    return CGImageDestinationFinalize(dest)
}

func drawNSImage(_ image: NSImage, in ctx: CGContext, rect: CGRect) {
    NSGraphicsContext.saveGraphicsState()
    let nsCtx = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.current = nsCtx
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
}

let icons: [(String, Int)] = [
    ("AppIcon-20.png", 20),
    ("AppIcon-20@2x.png", 40),
    ("AppIcon-20@3x.png", 60),
    ("AppIcon-29.png", 29),
    ("AppIcon-29@2x.png", 58),
    ("AppIcon-29@3x.png", 87),
    ("AppIcon-40.png", 40),
    ("AppIcon-40@2x.png", 80),
    ("AppIcon-40@3x.png", 120),
    ("AppIcon-60@2x.png", 120),
    ("AppIcon-60@3x.png", 180),
    ("AppIcon-76.png", 76),
    ("AppIcon-76@2x.png", 152),
    ("AppIcon-83.5@2x.png", 167),
    ("AppIcon-512@2x.png", 1024)
]

for (file, size) in icons {
    let outPath = (appIconDir as NSString).appendingPathComponent(file)
    let ok = saveOpaquePNG(size: size, outPath: outPath) { ctx, cgSize in
        ctx.setFillColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
        ctx.fill(CGRect(origin: .zero, size: cgSize))
        drawNSImage(nsImage, in: ctx, rect: CGRect(origin: .zero, size: cgSize))
    }
    if !ok {
        fputs("Failed writing \\(outPath)\\n", stderr)
        exit(1)
    }
}

let splashes = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]
for file in splashes {
    let outPath = (splashDir as NSString).appendingPathComponent(file)
    let ok = saveOpaquePNG(size: 2732, outPath: outPath) { ctx, cgSize in
        ctx.setFillColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1.0)
        ctx.fill(CGRect(origin: .zero, size: cgSize))
        let iconSize: CGFloat = 680.0
        let origin = CGPoint(x: (cgSize.width - iconSize) / 2.0, y: (cgSize.height - iconSize) / 2.0)
        let bgRect = CGRect(origin: origin, size: CGSize(width: iconSize, height: iconSize))
        let path = CGPath(roundedRect: bgRect, cornerWidth: 140, cornerHeight: 140, transform: nil)
        ctx.addPath(path)
        ctx.clip()
        ctx.setFillColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
        ctx.fill(bgRect)
        drawNSImage(nsImage, in: ctx, rect: bgRect)
    }
    if !ok {
        fputs("Failed writing \\(outPath)\\n", stderr)
        exit(1)
    }
}
print("Generated all Labprox iOS AppIcon and Splash PNGs from SVG.")
`;

  execFileSync('swift', ['-', svgPath, appIconDir, splashDir], {
    input: swiftScript,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

function fallbackFromTemplate() {
  if (!fs.existsSync(templateArchive)) {
    throw new Error('Template archive not found at ' + templateArchive);
  }
  const iosRoot = path.join(rootDir, 'ios');
  execFileSync('tar', ['-xzf', templateArchive, '-C', iosRoot, 'App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 'App/App/Assets.xcassets/Splash.imageset'], {
    stdio: 'inherit',
  });
  const baseIcon = path.join(appIconDir, 'AppIcon-512@2x.png');
  if (process.platform === 'darwin' && fs.existsSync(baseIcon)) {
    for (const item of iconSizes) {
      const dest = path.join(appIconDir, item.file);
      if (dest !== baseIcon) {
        execFileSync('sips', ['-z', String(item.size), String(item.size), baseIcon, '--out', dest], {
          stdio: 'ignore',
        });
      }
    }
  }
}

if (process.platform === 'darwin' && fs.existsSync(svgPath)) {
  try {
    generateWithMacSwift();
  } catch (err) {
    console.warn('Swift SVG icon generation failed, falling back to Capacitor template + sips:', err?.message || err);
    fallbackFromTemplate();
  }
} else {
  const missingAny = iconSizes.some(i => !fs.existsSync(path.join(appIconDir, i.file))) ||
    splashFiles.some(f => !fs.existsSync(path.join(splashDir, f)));
  if (missingAny) {
    fallbackFromTemplate();
  }
}
