import type { Layout, ThemeId } from "./schema";

// The "look" of a website: the design habits of good sites in the owner's industry, applied in code.
// A theme gives the fonts and colours; the look changes what makes two sites feel different even in the
// same theme: corner roundness, button shape, headline style, card style, spacing, banner height and
// alignment, a tinted banner band, heading ornament, header style, and whether the story comes before
// the products.
//
// Each industry belongs to a look FAMILY (below). A family lists a few allowed options per axis (the
// first is the family's default). Every site gets its own seed when it is built, and the seed picks one
// option per axis, plus the theme, colour and layout from the same family. So two bakeries share a
// family feel but are not the same site. Sites without a seed (older sites) keep the family default.
// Fonts are never changed here (only the weights loaded in lib/fonts.ts exist).

export type Look = {
  corners: "square" | "soft" | "round";
  button: "pill" | "soft" | "square"; // square = small corners, uppercase, spaced
  head: "plain" | "poster" | "quiet"; // poster = huge uppercase headlines, quiet = lighter, wider, smaller
  cards: "bordered" | "flat" | "tinted";
  density: "tight" | "normal" | "airy";
  hero: "centre" | "left";
  heroSize: "short" | "normal" | "tall";
  order: "products" | "story"; // story = about section before the products
  band: "none" | "soft"; // soft = the banner sits on a tinted, rounded-bottom band
  ornament: "bar" | "wide" | "none"; // the small mark above section headings
  header: "glass" | "solid" | "tint"; // top bar: see-through, solid page colour, or tinted
  side: "right" | "left"; // which side the banner photo sits on in the side-by-side banner
};

type Options = { [K in keyof Look]: readonly Look[K][] };

export const FAMILIES = {
  // Fashion, sarees, watches, perfumes: square, quiet, airy, tall banner, big photos do the selling.
  editorial: {
    corners: ["square", "soft"], button: ["square", "soft"], head: ["quiet", "plain"], cards: ["flat", "bordered"],
    density: ["airy", "normal"], hero: ["left", "centre"], heroSize: ["tall", "normal"], order: ["products"],
    band: ["none", "soft"], ornament: ["none", "wide"], header: ["glass", "solid"], side: ["right", "left"],
  },
  // Bakeries, tea, dairy, flowers, beauty, pets: soft and friendly, rounded, tinted cards.
  warm: {
    corners: ["round", "soft"], button: ["pill", "soft"], head: ["plain", "quiet"], cards: ["tinted", "flat", "bordered"],
    density: ["normal", "airy"], hero: ["centre", "left"], heroSize: ["normal", "tall"], order: ["products"],
    band: ["soft", "none"], ornament: ["bar", "wide", "none"], header: ["glass", "solid", "tint"], side: ["right", "left"],
  },
  // Restaurants, snacks, sport, footwear, vehicles: huge uppercase headline, tall banner, hard-edged cards.
  poster: {
    corners: ["soft", "square", "round"], button: ["square", "pill"], head: ["poster", "plain"], cards: ["bordered", "tinted", "flat"],
    density: ["normal", "tight"], hero: ["left", "centre"], heroSize: ["tall", "normal"], order: ["products"],
    band: ["none", "soft"], ornament: ["bar", "none"], header: ["glass", "solid"], side: ["right", "left"],
  },
  // Manufacturing, logistics, healthcare, finance: plain, tight, credible, capabilities first.
  corporate: {
    corners: ["square", "soft"], button: ["soft", "square"], head: ["plain", "quiet"], cards: ["bordered", "tinted", "flat"],
    density: ["tight", "normal"], hero: ["left", "centre"], heroSize: ["short", "normal"], order: ["story", "products"],
    band: ["none", "soft"], ornament: ["bar", "wide"], header: ["solid", "glass"], side: ["right", "left"],
  },
  // Handicrafts, interiors, furniture, farms, travel: story first, generous space, gentle corners.
  story: {
    corners: ["soft", "round", "square"], button: ["soft", "pill", "square"], head: ["plain", "quiet"], cards: ["flat", "tinted", "bordered"],
    density: ["airy", "normal"], hero: ["left", "centre"], heroSize: ["normal", "tall"], order: ["story", "products"],
    band: ["none", "soft"], ornament: ["bar", "wide", "none"], header: ["glass", "tint"], side: ["right", "left"],
  },
  // Electronics, eyewear, bags, education: clean and light, rounded cards on grey panels.
  clean: {
    corners: ["soft", "round", "square"], button: ["pill", "soft"], head: ["plain", "poster"], cards: ["tinted", "bordered", "flat"],
    density: ["tight", "normal"], hero: ["centre", "left"], heroSize: ["short", "normal"], order: ["products", "story"],
    band: ["soft", "none"], ornament: ["bar", "wide", "none"], header: ["glass", "solid"], side: ["right", "left"],
  },
} as const satisfies Record<string, Options>;

export type LookId = keyof typeof FAMILIES;

// Themes that suit each family besides the industry's own (the seed may pick one of these).
export const FAMILY_THEMES: Record<LookId, ThemeId[]> = {
  editorial: ["boutique", "craft"],
  warm: ["kitchen", "fresh", "craft"],
  poster: ["bazaar", "kitchen", "studio"],
  corporate: ["studio", "bazaar"],
  story: ["craft", "boutique", "fresh"],
  clean: ["studio", "bazaar", "fresh"],
};

// Product layouts that suit each starting layout (a text menu is kept as a menu).
export const LAYOUT_ALTS: Record<Layout, Layout[]> = {
  grid: ["grid", "lookbook"],
  lookbook: ["lookbook", "grid"],
  list: ["list", "grid"],
  menu: ["menu"],
};

// Which family each industry in lib/references.ts belongs to (from what the reference homepages showed).
export const INDUSTRY_LOOK: Record<string, LookId> = {
  "ethnic-wear": "editorial", fashion: "editorial", jewellery: "editorial", "jewellery-diamonds": "editorial",
  watches: "editorial", perfumes: "editorial", "wedding-events": "editorial",
  "tea-coffee": "warm", bakery: "warm", dairy: "warm", "flowers-gifting": "warm", beauty: "warm", haircare: "warm",
  "pet-care": "warm", "toys-kids": "warm", cleaning: "warm",
  restaurant: "poster", "snacks-fmcg": "poster", footwear: "poster", "sports-fitness": "poster", automotive: "poster",
  manufacturing: "corporate", packaging: "corporate", "building-materials": "corporate", logistics: "corporate",
  "industrial-automation": "corporate", "marine-shipping": "corporate", "energy-electrical": "corporate",
  telecom: "corporate", pharma: "corporate", fintech: "corporate", healthcare: "corporate", recruitment: "corporate",
  "water-purifier": "corporate", "waste-management": "corporate",
  handicrafts: "story", interiors: "story", furniture: "story", agriculture: "story", travel: "story", "real-estate": "story",
  electronics: "clean", eyewear: "clean", "luggage-bags": "clean", education: "clean", "stationery-printing": "clean",
};

// When the planner finds no matching industry, the theme still gives a sensible family.
const THEME_FAMILY: Record<ThemeId, LookId> = {
  boutique: "editorial", kitchen: "warm", fresh: "warm", studio: "corporate", craft: "story", bazaar: "poster",
};

export function familyOf(industry: string | null | undefined, theme: ThemeId): LookId {
  return (industry && INDUSTRY_LOOK[industry]) || THEME_FAMILY[theme] || "clean";
}

// A small seeded random generator, so a site's choices are fixed once it has a seed.
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One number per site, from its name (FNV-1a); the same name always gives the same look.
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (const ch of text.toLowerCase().trim()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const AXES = ["corners", "button", "head", "cards", "density", "hero", "heroSize", "order", "band", "ornament", "header", "side"] as const;

export function lookFor(industry: string | null | undefined, theme: ThemeId, seed?: number | null): Look {
  const fam = FAMILIES[familyOf(industry, theme)] as Options;
  const rand = typeof seed === "number" ? rngFrom(seed ^ 0x5bd1e995) : null;
  const out: Record<string, string> = {};
  for (const axis of AXES) {
    const list = fam[axis] as readonly string[];
    out[axis] = rand ? list[Math.floor(rand() * list.length)] : list[0];
  }
  return out as unknown as Look;
}

const RADIUS: Record<Look["corners"], string> = { square: "2px", soft: "10px", round: "20px" };

// Inline CSS variables (merged over the theme's) and data attributes that lib/siteCss.ts reacts to.
export function lookVars(look: Look): Record<string, string> {
  return { "--s-radius": RADIUS[look.corners] };
}

export function lookAttrs(look: Look): Record<string, string> {
  return {
    "data-btn": look.button,
    "data-head": look.head,
    "data-cards": look.cards,
    "data-density": look.density,
    "data-hero": look.hero,
    "data-hsize": look.heroSize,
    "data-order": look.order,
    "data-band": look.band,
    "data-orn": look.ornament,
    "data-header": look.header,
    "data-side": look.side,
  };
}
