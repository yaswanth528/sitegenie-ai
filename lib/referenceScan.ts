import type { ThemeId } from "./schema";

// What the one-time homepage scan (2026-11-06) saw on each industry's reference sites.
// Only design facts were recorded: colour families, corner style, layout habits. No text, images or logos.
// "read" is how many of the 3 sites could be scanned; the rest blocked automated visits and were skipped.
// "accent" is the index of the colour option inside the theme (see the palettes in lib/themes.ts).
// "theme" and "hero" are set only where the scan disagreed with the first guess in lib/references.ts.
export type Scan = { read: number; accent: 0 | 1 | 2; note: string; theme?: ThemeId; hero?: "full" | "split" };

export const SCAN: Record<string, Scan> = {
  "ethnic-wear": { read: 2, accent: 0, note: "Cream and white pages, maroon/red accents, square corners, a thin announcement bar, rows of product photos then big banners." },
  "manufacturing": { read: 2, accent: 1, hero: "full", note: "White pages with navy/blue, light plain sans-serif type, a full-height photo or video banner; products and capabilities as plain blocks." },
  "tea-coffee": { read: 3, accent: 1, note: "White with warm cream tints, green or orange/gold accents, rounded pill buttons on the casual brands and square gold uppercase ones on the premium brand; photo banners alternating with product rows." },
  "bakery": { read: 2, accent: 0, note: "Off-white with soft pastel (pink, mint) tints, red or dark accents, gently rounded buttons, big tasty banner first, then product rows; announcement bar." },
  "restaurant": { read: 3, accent: 0, hero: "full", note: "Tall banner photo, orange or red accents on white and black, big uppercase headline, rounded buttons, menu and ordering close to the top." },
  "snacks-fmcg": { read: 2, accent: 1, note: "Very bold oversized headlines, saturated yellow or berry-pink accents, pill buttons, big pack photos." },
  "fashion": { read: 3, accent: 0, note: "Black and white with one red accent, square corners everywhere, tall editorial banner, tight product grid; very little text." },
  "jewellery": { read: 2, accent: 2, theme: "boutique", note: "Light ivory, cream and peach backgrounds (not dark), gold/bronze accents, rounded buttons, one large banner then product rows; announcement bar." },
  "beauty": { read: 3, accent: 1, note: "White pages, black or one bright button colour, short banner with products straight beneath, announcement bar at the top, rounded product cards." },
  "automotive": { read: 3, accent: 0, note: "Black or white pages with red (and gold) accents, uppercase square buttons, a tall full-width vehicle photo or video." },
  "furniture": { read: 1, accent: 0, note: "Cream and warm brown with a coral/terracotta button colour, rounded buttons, announcement bar. Based on one site read." },
  "healthcare": { read: 1, accent: 0, note: "White with deep blue buttons and a teal secondary colour, small corner rounding, full-height banner. Based on one site read." },
  "agriculture": { read: 3, accent: 0, hero: "full", note: "Green and orange accents with pale green tints, rounded buttons, large farm photo banners with the headline over them." },
  "real-estate": { read: 2, accent: 2, theme: "boutique", note: "Elegant serif headings, bronze/gold on black and white, square buttons, large project photos or video; dark sections between light ones." },
  "education": { read: 3, accent: 1, note: "White with one strong colour (purple, green or red), dark or rounded buttons, large bold headline, course cards under a tall banner." },
  "travel": { read: 1, accent: 0, note: "Large bold headline over a video or photo banner, a single strong red accent, very rounded buttons. Based on one site read." },
  "electronics": { read: 3, accent: 1, note: "White with light-grey panels, black or blue buttons with one pop colour (yellow, blue, green), rounded 8-16 px corners, product rows then banner." },
  "footwear": { read: 2, accent: 2, note: "Yellow or green with black, uppercase buttons, rounded product cards, a video or photo banner, announcement bar." },
  "logistics": { read: 3, accent: 0, note: "Strong brand colours (dark navy, yellow, blue or red), banner with text over the photo, services shown as simple blocks." },
  "packaging": { read: 3, accent: 0, note: "White with black and one red/coral or navy accent, uppercase buttons, a very large bold headline over a photo, product-type rows." },
  "pharma": { read: 1, accent: 0, note: "White and corporate blue, plain sans-serif, large photo banner. Based on one site read." },
  "fintech": { read: 3, accent: 2, note: "Very large headline, white or black page, one bright accent (blue or green), minimal copy, product shown beside the headline." },
  "jewellery-diamonds": { read: 3, accent: 0, note: "Serif display type, red, wine or deep teal with cream, mostly white pages, large ornament photos, announcement bar." },
  "interiors": { read: 3, accent: 0, note: "Warm beige and dark brown with a terracotta accent, headline over a large room photo, alternating banner and photo rows." },
  "cleaning": { read: 1, accent: 2, note: "Pale clean backgrounds, simple banner. Based on one site read." },
  "pet-care": { read: 3, accent: 1, note: "Orange as the main button colour, cream, pink and light-blue tints, rounded buttons and cards, short cheerful banner." },
  "sports-fitness": { read: 2, accent: 2, note: "White and black with a red pill-shaped uppercase button, a large photo banner, product grid. Based on two sites read." },
  "toys-kids": { read: 2, accent: 1, note: "Rounded playful font on one brand, purple and bright colours, pill-shaped buttons, video banner with headline over it." },
  "wedding-events": { read: 1, accent: 2, note: "Only a gifting and flowers site was read: white and neutral with black sections, product rows. Weak evidence." },
  "energy-electrical": { read: 3, accent: 2, hero: "full", note: "Dark green or black sections, neon green or blue accents, very large headline over a tall photo or video banner." },
  "dairy": { read: 3, accent: 0, note: "White with strong brand red or fresh green on pale mint, rounded pill buttons, plain pack photos." },
  "watches": { read: 0, accent: 2, note: "Not read (all three sites blocked the scan); suggestion is unverified." },
  "handicrafts": { read: 3, accent: 0, note: "White or cream with terracotta, wine or olive accents, a serif or soft font, small corner rounding, photo rows with a story section." },
  "stationery-printing": { read: 2, accent: 1, note: "White with purple or blue and a coral uppercase button, simple banner then product tiles." },
  "water-purifier": { read: 3, accent: 0, note: "White with navy, purple or green, pill-shaped buttons, big banner followed by product and feature rows." },
  "flowers-gifting": { read: 2, accent: 0, note: "White with pink/red or teal-orange accents, product rows straight under the banner." },
  "perfumes": { read: 2, accent: 2, note: "Gold/bronze and wine on cream or white, black uppercase buttons on one brand, banner and product rows alternating." },
  "luggage-bags": { read: 3, accent: 1, note: "White with navy, yellow or red accents, uppercase buttons, announcement bar, video or photo banner then product rows." },
  "eyewear": { read: 2, accent: 1, note: "White and black, teal or blue buttons, a video or photo banner and product rows." },
  "haircare": { read: 2, accent: 1, note: "Soft ivory with pale blue or yellow, pill-shaped buttons and very round (about 24 px) cards, photo rows with short text between." },
  "building-materials": { read: 3, accent: 1, hero: "full", note: "Navy and blue with yellow, uppercase buttons, a very large headline over a full-height banner." },
  "industrial-automation": { read: 1, accent: 0, note: "Light grey and white with green or blue, small rounded buttons. Based on one site read." },
  "telecom": { read: 3, accent: 0, note: "Bold single brand colour (red or blue) on white, plans as cards, short banner." },
  "recruitment": { read: 0, accent: 1, note: "Not read (all three sites blocked the scan); suggestion is unverified." },
  "waste-management": { read: 3, accent: 0, note: "White with green, red or slate, rounded buttons, large photo banner, service blocks." },
  "marine-shipping": { read: 3, accent: 0, hero: "full", note: "Deep navy and sea blue with an orange accent, very large uppercase headline over a full-height video or photo, square-ish buttons." },
};
