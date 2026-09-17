"use client";

import { useEffect, useRef } from "react";

const CHAR_SETS: Record<string, string> = {
  binary: "01",
  blocks: " ░▒▓█",
  standard: " .:-=+*#%@",
  minimal: " .:*#",
  hex: "0123456789ABCDEF",
};

export type AsciiConfig = {
  src?: string;
  cellSize: number;
  charSet: keyof typeof CHAR_SETS | string;
  customChars?: string;
  coverage: number;
  invert: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  edgeEmphasis: number;
  tint: string;
  tintOpacity: number;
  overlayBlend: GlobalCompositeOperation;
  bgColor: string;
  bgOpacity: number;
  animated: boolean;
  animSpeed: number;
  animIntensity: number;
  pfx: {
    vignette: { enabled: boolean; intensity: number };
    scanLines: { enabled: boolean; intensity: number };
    chromatic: { enabled: boolean; intensity: number };
    bloom: { enabled: boolean; intensity: number };
    filmGrain: { enabled: boolean; intensity: number };
  };
};

export const DEFAULT_ASCII_CONFIG: AsciiConfig = {
  cellSize: 3,
  charSet: "binary",
  coverage: 100,
  invert: false,
  brightness: 0,
  contrast: 115,
  saturation: 100,
  grayscale: 92,
  edgeEmphasis: 40,
  tint: "#000000",
  tintOpacity: 45,
  overlayBlend: "overlay",
  bgColor: "#050505",
  bgOpacity: 90,
  animated: true,
  animSpeed: 100,
  animIntensity: 60,
  pfx: {
    vignette: { enabled: true, intensity: 38 },
    scanLines: { enabled: true, intensity: 28 },
    chromatic: { enabled: true, intensity: 40 },
    bloom: { enabled: true, intensity: 60 },
    filmGrain: { enabled: true, intensity: 40 },
  },
};

const MAX_RENDER_WIDTH = 1400;

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function buildGlyphMasks(chars: string, cellPx: number) {
  const c = document.createElement("canvas");
  c.width = cellPx;
  c.height = cellPx;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  // Oversize the glyph relative to the cell: at 3px a normal-weight character
  // marks almost no pixels, and the whole field reads as flat black.
  ctx.font = `bold ${Math.round(cellPx * 1.35)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  return [...chars].map((ch) => {
    ctx.clearRect(0, 0, cellPx, cellPx);
    ctx.fillStyle = "#fff";
    ctx.fillText(ch, cellPx / 2, cellPx / 2);
    const img = ctx.getImageData(0, 0, cellPx, cellPx).data;
    const mask = new Uint8Array(cellPx * cellPx);
    for (let i = 0; i < mask.length; i++) mask[i] = img[i * 4 + 3];
    return mask;
  });
}

function proceduralSource(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.48;
  const r = Math.min(w, h) * 0.42;

  const orb = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.35,
    r * 0.05,
    cx,
    cy,
    r,
  );
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.3, "#e6e2f5");
  orb.addColorStop(0.62, "#8b83b8");
  orb.addColorStop(0.88, "#2e2a44");
  orb.addColorStop(1, "#000000");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.9);
  halo.addColorStop(0, "rgba(131,110,249,0.45)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  return c;
}

function makeNoiseTile(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const buf = new Uint32Array(img.data.buffer);
  for (let i = 0; i < buf.length; i++) {
    const v = (Math.random() * 255) | 0;
    buf[i] = (255 << 24) | (v << 16) | (v << 8) | v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function AsciiBackground({
  config = DEFAULT_ASCII_CONFIG,
  className,
}: {
  config?: AsciiConfig;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let disposed = false;

    let source: CanvasImageSource | null = null;
    let sourceW = 0;
    let sourceH = 0;

    const sampler = document.createElement("canvas");
    const samplerCtx = sampler.getContext("2d", { willReadFrequently: true })!;
    const layer = document.createElement("canvas");
    const layerCtx = layer.getContext("2d")!;
    const noise = makeNoiseTile(128);

    let cols = 0;
    let rows = 0;
    let cellPx = 0;
    let glyphs: Uint8Array[] = [];
    let out: ImageData | null = null;
    let outBuf: Uint32Array | null = null;
    let renderW = 0;
    let renderH = 0;

    const chars =
      (configRef.current.customChars ||
        CHAR_SETS[configRef.current.charSet] ||
        CHAR_SETS.binary) ?? "01";

    function layout() {
      const cfg = configRef.current;
      const cssW = canvas!.clientWidth || window.innerWidth;
      const cssH = canvas!.clientHeight || window.innerHeight;
      if (cssW === 0 || cssH === 0) return false;

      const scale = Math.min(1, MAX_RENDER_WIDTH / cssW);
      cellPx = Math.max(2, Math.round(cfg.cellSize));
      cols = Math.max(1, Math.floor((cssW * scale) / cellPx));
      rows = Math.max(1, Math.floor((cssH * scale) / cellPx));
      renderW = cols * cellPx;
      renderH = rows * cellPx;

      canvas!.width = renderW;
      canvas!.height = renderH;
      sampler.width = cols;
      sampler.height = rows;
      layer.width = renderW;
      layer.height = renderH;

      glyphs = buildGlyphMasks(chars, cellPx);
      out = layerCtx.createImageData(renderW, renderH);
      outBuf = new Uint32Array(out.data.buffer);
      return true;
    }

    function drawFrame(time: number) {
      const cfg = configRef.current;
      if (!out || !outBuf || !source) return;

      samplerCtx.clearRect(0, 0, cols, rows);
      // Cover-fit: crop the source to the grid's aspect rather than stretching it.
      const gridAspect = cols / rows;
      const srcAspect = sourceW / sourceH;
      let sw = sourceW;
      let sh = sourceH;
      if (srcAspect > gridAspect) sw = sourceH * gridAspect;
      else sh = sourceW / gridAspect;
      samplerCtx.drawImage(
        source,
        (sourceW - sw) / 2,
        (sourceH - sh) / 2,
        sw,
        sh,
        0,
        0,
        cols,
        rows,
      );
      const sample = samplerCtx.getImageData(0, 0, cols, rows).data;

      const t = time * 0.001 * (cfg.animSpeed / 100);
      const animAmt = cfg.animated && !reduceMotion ? cfg.animIntensity / 100 : 0;
      // Flicker is a global gain jitter plus a per-cell shimmer, so the field
      // never pulses as one flat sheet.
      const globalFlicker =
        1 + animAmt * (Math.sin(t * 7.3) * 0.06 + (Math.random() - 0.5) * 0.09);

      const contrast = cfg.contrast / 100;
      const brightness = cfg.brightness / 100;
      const sat = cfg.saturation / 100;
      const gray = cfg.grayscale / 100;
      const edge = cfg.edgeEmphasis / 100;
      const coverage = cfg.coverage / 100;
      const nChars = glyphs.length;

      outBuf.fill(0);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const si = (y * cols + x) * 4;
          let r = sample[si];
          let g = sample[si + 1];
          let b = sample[si + 2];

          let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

          if (edge > 0) {
            const right = x < cols - 1 ? si + 4 : si;
            const down = y < rows - 1 ? si + cols * 4 : si;
            const lr =
              (0.2126 * sample[right] +
                0.7152 * sample[right + 1] +
                0.0722 * sample[right + 2]) /
              255;
            const ld =
              (0.2126 * sample[down] +
                0.7152 * sample[down + 1] +
                0.0722 * sample[down + 2]) /
              255;
            lum += (Math.abs(lum - lr) + Math.abs(lum - ld)) * edge * 2;
          }

          lum = (lum - 0.5) * contrast + 0.5 + brightness;

          if (animAmt > 0) {
            const shimmer =
              Math.sin((x * 0.21 + y * 0.17 + t * 3.1) * 1.7) * 0.5 + 0.5;
            lum *= globalFlicker * (1 - animAmt * 0.22 * shimmer);
          }

          lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;
          if (cfg.invert) lum = 1 - lum;

          if (lum < 0.04) continue;
          if (coverage < 1) {
            const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
            if ((h % 1000) / 1000 > coverage) continue;
          }

          const gl = glyphs[Math.min(nChars - 1, (lum * nChars) | 0)];

          const lg = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = r + (lg - r) * gray;
          g = g + (lg - g) * gray;
          b = b + (lg - b) * gray;
          if (sat !== 1) {
            r = lg + (r - lg) * sat;
            g = lg + (g - lg) * sat;
            b = lg + (b - lg) * sat;
          }

          // Luminance drives glyph choice and alpha. Keep the colour near its
          // sampled value so bright cells stay bright instead of being dimmed twice.
          const k = 0.55 + 0.45 * lum;
          const cr = Math.min(255, r * k + 40) | 0;
          const cg = Math.min(255, g * k + 40) | 0;
          const cb = Math.min(255, b * k + 40) | 0;
          const rgb = (cb << 16) | (cg << 8) | cr;
          const cellAlpha = (0.3 + 0.7 * lum) * globalFlicker;

          const ox = x * cellPx;
          const oy = y * cellPx;
          for (let py = 0; py < cellPx; py++) {
            const rowOff = (oy + py) * renderW + ox;
            const mOff = py * cellPx;
            for (let px = 0; px < cellPx; px++) {
              const a = gl[mOff + px] * cellAlpha;
              if (a > 8) outBuf[rowOff + px] = (Math.min(255, a) << 24) | rgb;
            }
          }
        }
      }

      layerCtx.putImageData(out, 0, 0);

      const bg = hexToRgb(cfg.bgColor);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${cfg.bgOpacity / 100})`;
      ctx!.fillRect(0, 0, renderW, renderH);

      const { chromatic, bloom, scanLines, filmGrain, vignette } = cfg.pfx;

      if (chromatic.enabled) {
        const off = (chromatic.intensity / 100) * 4;
        ctx!.globalCompositeOperation = "lighter";
        ctx!.globalAlpha = 0.5;
        ctx!.drawImage(layer, -off, 0);
        ctx!.drawImage(layer, off, 0);
        ctx!.globalAlpha = 1;
        ctx!.globalCompositeOperation = "source-over";
      }

      ctx!.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 1;
      ctx!.drawImage(layer, 0, 0);

      if (bloom.enabled) {
        const i = bloom.intensity / 100;
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        ctx!.globalAlpha = i * 0.55;
        ctx!.filter = `blur(${2 + i * 8}px)`;
        ctx!.drawImage(layer, 0, 0);
        ctx!.restore();
      }

      if (cfg.tintOpacity > 0) {
        ctx!.save();
        ctx!.globalCompositeOperation = cfg.overlayBlend;
        ctx!.globalAlpha = cfg.tintOpacity / 100;
        ctx!.fillStyle = cfg.tint;
        ctx!.fillRect(0, 0, renderW, renderH);
        ctx!.restore();
      }

      if (scanLines.enabled) {
        const a = (scanLines.intensity / 100) * 0.5;
        ctx!.save();
        ctx!.globalCompositeOperation = "multiply";
        ctx!.fillStyle = `rgba(0,0,0,${a})`;
        for (let y = 0; y < renderH; y += 3) ctx!.fillRect(0, y, renderW, 1);
        ctx!.restore();
      }

      if (filmGrain.enabled) {
        ctx!.save();
        ctx!.globalCompositeOperation = "overlay";
        ctx!.globalAlpha = (filmGrain.intensity / 100) * 0.22;
        const ox = (Math.random() * 128) | 0;
        const oy = (Math.random() * 128) | 0;
        const pat = ctx!.createPattern(noise, "repeat")!;
        ctx!.translate(-ox, -oy);
        ctx!.fillStyle = pat;
        ctx!.fillRect(0, 0, renderW + 128, renderH + 128);
        ctx!.restore();
      }

      if (vignette.enabled) {
        const i = vignette.intensity / 100;
        const g2 = ctx!.createRadialGradient(
          renderW / 2,
          renderH / 2,
          Math.min(renderW, renderH) * 0.25,
          renderW / 2,
          renderH / 2,
          Math.max(renderW, renderH) * 0.75,
        );
        g2.addColorStop(0, "rgba(0,0,0,0)");
        g2.addColorStop(1, `rgba(0,0,0,${i * 1.05})`);
        ctx!.save();
        ctx!.globalCompositeOperation = "source-over";
        ctx!.fillStyle = g2;
        ctx!.fillRect(0, 0, renderW, renderH);
        ctx!.restore();
      }
    }

    function loop(time: number) {
      if (disposed) return;
      drawFrame(time);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (!layout()) return;
      if (configRef.current.animated && !reduceMotion) {
        raf = requestAnimationFrame(loop);
      } else {
        drawFrame(0);
      }
    }

    function setSource(img: CanvasImageSource, w: number, h: number) {
      source = img;
      sourceW = w;
      sourceH = h;
      start();
    }

    if (config.src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!disposed) setSource(img, img.naturalWidth, img.naturalHeight);
      };
      img.onerror = () => {
        const c = proceduralSource(1024, 1024);
        if (!disposed) setSource(c, c.width, c.height);
      };
      img.src = config.src;
    } else {
      const c = proceduralSource(1024, 1024);
      setSource(c, c.width, c.height);
    }

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      if (source) start();
    });
    ro.observe(canvas);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [config.src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "absolute inset-0 h-full w-full"}
    />
  );
}
