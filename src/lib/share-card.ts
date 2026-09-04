import {
  ClipOp,
  FontWeight,
  Skia,
  TextAlign,
  TileMode,
  type SkCanvas,
  type SkImage,
  type SkParagraphStyle,
  type SkTextStyle,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

import { paintBadge } from '@/components/achievements/badge-canvas';
import { AURA_SOURCE, AURA_SPAN, auraColors } from '@/lib/badge-aura-shader';
import type { BadgeMaterial, RGB } from '@/lib/badge-material';
import { hexBadge, REST_TILT } from '@/lib/badge-mesh';

/**
 * What an achievement looks like once it leaves the app. A 9:16 still, sized
 * for a story and posted as-is anywhere else.
 *
 * It is drawn straight into an offscreen Skia surface rather than screenshotted
 * off a mounted view. The badge is not a React view — `paintBadge` records into
 * a bare `SkCanvas` and the aura is a fragment shader — so there is nothing a
 * view snapshot could capture that isn't already easier to draw directly, and
 * drawing it means the card comes out at exactly 1080x1920 instead of at
 * whatever density the phone happens to have. The badge is a solid projected at
 * whatever scale it is asked for, so it is as sharp filling a card as it is in
 * a grid slot.
 */
export const CARD = { width: 1080, height: 1920 };

/**
 * Every number that makes the layout. The badge sits above the middle so the
 * caption below it lands in the upper two thirds, which is the band a story
 * leaves clear of its own chrome.
 */
const L = {
  padding: 96,
  badgeSize: 580,
  badgeCenterY: 690,
  captionGap: 100,
  eyebrow: { size: 34, tracking: 5, alpha: 0.52, gap: 20 },
  exercise: { size: 74, lines: 2, gap: 26 },
  value: { size: 148, gap: 18 },
  detail: { size: 40, alpha: 0.58 },
  footer: { icon: 92, radius: 0.2237, label: 52, gap: 24, bottom: 132, alpha: 0.92 },
  /** The fan is a still, so its drift is frozen at one chosen turn. */
  auraTime: 4.2,
};

/** What the footer keeps between itself and a caption that ran to two lines. */
const FOOTER_CLEARANCE = 72;

export type ShareCard = {
  numeral: string;
  tier: string;
  exercise: string;
  requirement: string;
  detail: string;
  material: BadgeMaterial;
};

export function drawShareCard(
  card: ShareCard,
  fonts: SkTypefaceFontProvider,
  logo: SkImage,
): SkImage {
  // CPU-backed rather than `MakeOffscreen`: a GPU surface needs a Skia context
  // on the calling thread, which the JS thread has no reason to have. A still
  // this size draws fast either way.
  const surface = Skia.Surface.Make(CARD.width, CARD.height);
  if (surface == null) throw new Error('Skia.Surface.Make returned null');

  const canvas = surface.getCanvas();
  paintBackground(canvas, card.material);
  paintAura(canvas, card.material);
  paintCardBadge(canvas, card);
  const bottom = paintCaption(canvas, card, fonts);
  paintFooter(canvas, fonts, logo, bottom);

  surface.flush();
  return surface.makeImageSnapshot();
}

/**
 * The metal's unlit colour taken most of the way to black, twice. A tier is
 * recognisable from its card at thumbnail size, and the caption still has the
 * contrast of white on near-black.
 */
function paintBackground(canvas: SkCanvas, material: BadgeMaterial) {
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      Skia.Point(CARD.width / 2, 0),
      Skia.Point(CARD.width / 2, CARD.height),
      [color(shade(material.face.dark, 0.42)), color(shade(material.face.dark, 0.13))],
      [0, 1],
      TileMode.Clamp,
    ),
  );
  canvas.drawPaint(paint);
}

function paintAura(canvas: SkCanvas, material: BadgeMaterial) {
  if (AURA_SOURCE == null) return;
  const span = L.badgeSize * AURA_SPAN;
  const { glow, beam } = auraColors(material);

  const paint = Skia.Paint();
  paint.setShader(
    AURA_SOURCE.makeShader([span / 2, span / 2, span / 2, L.auraTime, 1, ...glow, ...beam]),
  );

  canvas.save();
  canvas.translate(CARD.width / 2 - span / 2, L.badgeCenterY - span / 2);
  canvas.drawRect(Skia.XYWHRect(0, 0, span, span), paint);
  canvas.restore();
}

function paintCardBadge(canvas: SkCanvas, card: ShareCard) {
  canvas.save();
  // `paintBadge` centres on (size / 2, size / 2) in its own space.
  canvas.translate((CARD.width - L.badgeSize) / 2, L.badgeCenterY - L.badgeSize / 2);
  paintBadge(
    canvas,
    hexBadge(card.numeral),
    card.material,
    REST_TILT.rx,
    REST_TILT.ry,
    L.badgeSize,
    0,
  );
  canvas.restore();
}

/** The same four lines as the spotlight, in the same order. Returns the baseline
 *  the footer has to clear. */
function paintCaption(canvas: SkCanvas, card: ShareCard, fonts: SkTypefaceFontProvider): number {
  const width = CARD.width - L.padding * 2;
  let y = L.badgeCenterY + L.badgeSize / 2 + L.captionGap;

  y += line(canvas, fonts, card.tier.toUpperCase(), width, y, {
    size: L.eyebrow.size,
    weight: FontWeight.SemiBold,
    alpha: L.eyebrow.alpha,
    tracking: L.eyebrow.tracking,
  }) + L.eyebrow.gap;

  y += line(canvas, fonts, card.exercise, width, y, {
    size: L.exercise.size,
    weight: FontWeight.Bold,
    maxLines: L.exercise.lines,
  }) + L.exercise.gap;

  y += line(canvas, fonts, card.requirement, width, y, {
    size: L.value.size,
    weight: FontWeight.Bold,
  }) + L.value.gap;

  y += line(canvas, fonts, card.detail, width, y, {
    size: L.detail.size,
    weight: FontWeight.Normal,
    alpha: L.detail.alpha,
  });

  return y;
}

/** The app icon and its name, so a card is attributable wherever it is reposted.
 *  The icon ships full-bleed square; 22.37% is the corner radius iOS masks it
 *  with, which is what makes it read as the app rather than as a sticker. */
function paintFooter(canvas: SkCanvas, fonts: SkTypefaceFontProvider, logo: SkImage, captionBottom: number) {
  const { icon, radius, label, gap, bottom, alpha } = L.footer;

  const name = build(fonts, 'Pawer', { size: label, weight: FontWeight.Bold, alpha });
  name.layout(CARD.width);
  // `getLongestLine` comes back a fraction under the advance it measured, so a
  // second layout at exactly that width wraps the last glyph onto its own line.
  const textWidth = Math.ceil(name.getLongestLine()) + 2;

  const left = (CARD.width - (icon + gap + textWidth)) / 2;
  const top = Math.max(CARD.height - bottom - icon, captionBottom + FOOTER_CLEARANCE);

  const paint = Skia.Paint();
  paint.setAlphaf(alpha);
  paint.setAntiAlias(true);
  canvas.save();
  canvas.clipRRect(
    Skia.RRectXY(Skia.XYWHRect(left, top, icon, icon), icon * radius, icon * radius),
    ClipOp.Intersect,
    true,
  );
  canvas.drawImageRect(
    logo,
    Skia.XYWHRect(0, 0, logo.width(), logo.height()),
    Skia.XYWHRect(left, top, icon, icon),
    paint,
  );
  canvas.restore();

  name.layout(textWidth);
  name.paint(canvas, left + icon + gap, top + (icon - name.getHeight()) / 2);
}

type LineStyle = {
  size: number;
  weight: FontWeight;
  alpha?: number;
  tracking?: number;
  maxLines?: number;
};

function line(
  canvas: SkCanvas,
  fonts: SkTypefaceFontProvider,
  text: string,
  width: number,
  y: number,
  style: LineStyle,
): number {
  const paragraph = build(fonts, text, style);
  paragraph.layout(width);
  paragraph.paint(canvas, L.padding, y);
  return paragraph.getHeight();
}

function build(fonts: SkTypefaceFontProvider, text: string, style: LineStyle) {
  // Keys are added rather than set to undefined: the paragraph style crosses
  // JSI, and a present-but-undefined `ellipsis` reads there as a missing String
  // rather than as an absent option.
  const textStyle: SkTextStyle = {
    color: Skia.Color(`rgba(255, 255, 255, ${style.alpha ?? 1})`),
    fontFamilies: ['Nunito'],
    fontSize: style.size,
    fontStyle: { weight: style.weight },
  };
  if (style.tracking != null) textStyle.letterSpacing = style.tracking;

  const paragraphStyle: SkParagraphStyle = { textAlign: TextAlign.Center, textStyle };
  if (style.maxLines != null) {
    paragraphStyle.maxLines = style.maxLines;
    paragraphStyle.ellipsis = '…';
  }

  return Skia.ParagraphBuilder.Make(paragraphStyle, fonts).addText(text).build();
}

function shade([r, g, b]: RGB, amount: number): RGB {
  return [r * amount, g * amount, b * amount];
}

function color([r, g, b]: RGB) {
  return new Float32Array([r, g, b, 1]);
}
