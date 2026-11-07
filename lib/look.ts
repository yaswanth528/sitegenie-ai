import type { ThemeId } from "./schema";

// The "look" of a website: the design habits of good sites in the owner's industry, applied in code.
// A theme gives the fonts and colours; the look changes the things that make two sites feel different
// even in the same theme: corner roundness, button shape, headline style, card style, spacing, banner
// height and alignment, and whether the story comes before the products.
//
// Industries map to a handful of looks (below). The planner only names the industry; the build applies
// the look, so the result no longer depends on what the model felt like choosing.
// Fonts are never changed here (only the weights loaded in lib/fonts.ts exist).

export type Look = {
  corners: "square" | "soft" | "round";
  button: "pill" | "soft" | "square"; // square = small corners, uppercase, spaced
  head: "plain" | "poster" | "quiet"; // poster = huge uppercase headlines, quiet = lighter, wider, smaller
  cards: "plain" | "bordered" | "flat" | "tinted";
  density: "tight" | "normal" | "airy";
  hero: "centre" | "left";
  heroSize: "short" | "normal" | "tall";
  order: "products" | "story"; // story = about section before the products
  band: "none" | "soft"; // soft = the banner sits on a tinted, rounded-bottom band
};

export const LOOKS = {
  // Fashion, sarees, watches, perfumes: square, quiet, airy, tall banner, big photos do the selling.
  editorial: { corners: "square", button: "square", head: "quiet", cards: "flat", density: "airy", hero: "left", heroSize: "tall", order: "products", band: "none" },
  // Bakeries, tea, dairy, flowers, beauty, pets: soft and friendly, rounded, tinted cards.
  warm: { corners: "round", button: "pill", head: "plain", cards: "tinted", density: "normal", hero: "centre", heroSize: "normal", order: "products", band: "soft" },
  // Restaurants, snacks, sport, footwear, vehicles: huge uppercase headline, tall banner, hard-edged cards.
  poster: { corners: "soft", button: "square", head: "poster", cards: "bordered", density: "normal", hero: "left", heroSize: "tall", order: "products", band: "none" },
  // Manufacturing, logistics, healthcare, finance: plain, tight, credible, left aligned, capabilities first.
  corporate: { corners: "square", button: "soft", head: "plain", cards: "bordered", density: "tight", hero: "left", heroSize: "short", order: "story", band: "none" },
  // Handicrafts, interiors, furniture, farms, travel: story first, generous space, gentle corners.
  story: { corners: "soft", button: "soft", head: "plain", cards: "flat", density: "airy", hero: "left", heroSize: "normal", order: "story", band: "none" },
  // Electronics, eyewear, bags, education: clean and light, rounded cards on grey panels.
  clean: { corners: "soft", button: "pill", head: "plain", cards: "tinted", density: "tight", hero: "centre", heroSize: "short", order: "products", band: "soft" },
} as const satisfies Record<string, Look>;

export type LookId = keyof typeof LOOKS;

// Which look each industry in lib/references.ts gets (from what the reference homepages showed).
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

// When the planner finds no matching industry, the theme still gives a sensible look.
const THEME_LOOK: Record<ThemeId, LookId> = {
  boutique: "editorial", kitchen: "warm", fresh: "warm", studio: "corporate", craft: "story", bazaar: "poster",
};

export function lookFor(industry: string | null | undefined, theme: ThemeId): Look {
  const id = (industry && INDUSTRY_LOOK[industry]) || THEME_LOOK[theme] || "clean";
  return LOOKS[id];
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
  };
}
