import { SCAN } from "./referenceScan";
import { THEMES } from "./themes";
import type { Layout, ThemeId } from "./schema";

// SiteGenie's memory of what good websites look like, by kind of business.
// When an owner describes a business, the planner picks the closest industry here and takes
// inspiration from its reference brands: the theme, product layout, banner style, colour mood and
// tone of voice. It never copies a brand's name, logo, text or claims into the owner's site.
//
// The links are for people (us) to open and look at. The model only gets the brand names; it does not
// browse them, so there is no extra latency or cost per build.

export type Reference = { name: string; url: string };

export type Industry = {
  id: string;
  label: string;
  sites: [Reference, Reference, Reference];
  // Starting points that fit our six themes. The owner's words and photos always win.
  theme: ThemeId;
  layout: Layout;
  hero: "full" | "split";
  // Colour mood, the kind of photos, and how the copy should sound.
  feel: string;
  // From the one-time scan of the reference homepages (lib/referenceScan.ts).
  accent: 0 | 1 | 2; // colour option inside the theme
  read: number; // how many of the 3 sites could be scanned
  seen: string; // design habits seen on those sites
};

type Base = Omit<Industry, "accent" | "read" | "seen">;

const r = (name: string, url: string): Reference => ({ name, url });

const BASE: Base[] = [
  { id: "ethnic-wear", label: "Sarees, textiles & ethnic wear", theme: "boutique", layout: "lookbook", hero: "full",
    feel: "rich fabric close-ups, deep jewel or maroon tones, elegant and unhurried copy; let the big photos sell",
    sites: [r("Taneira", "https://www.taneira.com/"), r("Nalli", "https://www.nalli.com/"), r("Suta", "https://suta.in/")] },
  { id: "manufacturing", label: "Manufacturing & industrial", theme: "bazaar", layout: "list", hero: "split",
    feel: "plain, credible and sturdy; steel greys and one strong accent; capabilities, materials and bulk orders before prices; quotation based",
    sites: [r("Tata Steel", "https://www.tatasteel.com/"), r("Bharat Forge", "https://www.bharatforge.com/"), r("Kirloskar Brothers", "https://www.kirloskarpumps.com/")] },
  { id: "tea-coffee", label: "Chai, tea & coffee", theme: "kitchen", layout: "grid", hero: "full",
    feel: "warm browns and tea greens, steam and cup photos, friendly and cosy copy; blends and pack sizes as choices",
    sites: [r("Chaayos", "https://chaayos.com/"), r("Chai Point", "https://chaipoint.com/"), r("VAHDAM India", "https://www.vahdam.com/")] },
  { id: "bakery", label: "Bakery & confectionery", theme: "kitchen", layout: "grid", hero: "split",
    feel: "soft cream and chocolate tones, close mouth-watering photos, cheerful short copy; cakes with weight or size choices",
    sites: [r("Theobroma", "https://theobroma.in/"), r("Bakingo", "https://www.bakingo.com/"), r("Karachi Bakery", "https://www.karachibakery.com/")] },
  { id: "restaurant", label: "Restaurants & cafés", theme: "kitchen", layout: "menu", hero: "full",
    feel: "appetising full-width banner, a clear menu board with names and prices, timings and area easy to find, relaxed inviting copy",
    sites: [r("Social", "https://socialoffline.in/"), r("Barbeque Nation", "https://www.barbequenation.com/"), r("Domino's", "https://www.dominos.co.in/")] },
  { id: "snacks-fmcg", label: "Snacks & FMCG", theme: "fresh", layout: "grid", hero: "split",
    feel: "bright, clean pack photos, honest ingredient-led copy, playful but short; pack sizes as choices",
    sites: [r("The Whole Truth", "https://thewholetruthfoods.com/"), r("Paper Boat", "https://www.paperboatdrinks.com/"), r("Happilo", "https://happilo.com/")] },
  { id: "fashion", label: "Clothing & fashion", theme: "boutique", layout: "lookbook", hero: "full",
    feel: "editorial photos, restrained black, white or one bold colour, confident minimal copy; sizes as choices",
    sites: [r("Rare Rabbit", "https://thehouseofrare.com/"), r("Snitch", "https://www.snitch.com/"), r("The Souled Store", "https://www.thesouledstore.com/")] },
  { id: "jewellery", label: "Jewellery", theme: "craft", layout: "lookbook", hero: "full",
    feel: "dark or ivory backdrop so metal and stones shine, gold and rose tones, refined short copy; one hero piece at a time",
    sites: [r("CaratLane", "https://www.caratlane.com/"), r("GIVA", "https://www.giva.co/"), r("BlueStone", "https://www.bluestone.com/")] },
  { id: "beauty", label: "Beauty & skincare", theme: "boutique", layout: "grid", hero: "split",
    feel: "clean, light and airy, soft pastel or white, product-first photos, calm and trustworthy copy about what each product is for",
    sites: [r("Minimalist", "https://beminimalist.co/"), r("Mamaearth", "https://mamaearth.in/"), r("SUGAR Cosmetics", "https://www.sugarcosmetics.com/")] },
  { id: "automotive", label: "Automotive", theme: "bazaar", layout: "lookbook", hero: "full",
    feel: "dramatic full-width vehicle photo, dark and bold with one strong accent, short confident copy; models and variants before price",
    sites: [r("Royal Enfield", "https://www.royalenfield.com/"), r("Tata Motors", "https://www.tatamotors.com/"), r("Mahindra", "https://www.mahindra.com/")] },
  { id: "furniture", label: "Furniture & home furnishing", theme: "craft", layout: "lookbook", hero: "full",
    feel: "room-setting photos, warm wood and neutral tones, comfortable and reassuring copy; sizes and finishes as choices",
    sites: [r("Wakefit", "https://www.wakefit.co/"), r("Pepperfry", "https://www.pepperfry.com/"), r("Godrej Interio", "https://www.godrejinterio.com/")] },
  { id: "healthcare", label: "Healthcare & hospitals", theme: "studio", layout: "list", hero: "split",
    feel: "calm blues and greens, plenty of white space, reassuring plain language; services, timings, doctors and how to book up front; no medical claims",
    sites: [r("Apollo Hospitals", "https://www.apollohospitals.com/"), r("Manipal Hospitals", "https://www.manipalhospitals.com/"), r("Fortis Healthcare", "https://www.fortishealthcare.com/")] },
  { id: "agriculture", label: "Agriculture & farming", theme: "fresh", layout: "list", hero: "split",
    feel: "earthy greens and soil browns, farm and field photos, practical farmer-friendly copy; inputs, produce and how to order",
    sites: [r("DeHaat", "https://agrevolution.in/"), r("Ninjacart", "https://ninjacart.com/"), r("UPL", "https://www.upl-ltd.com/")] },
  { id: "real-estate", label: "Real estate & construction", theme: "studio", layout: "lookbook", hero: "full",
    feel: "large project and building photos, deep navy or charcoal with gold, polished and assured copy; locations and enquiry first, price on request",
    sites: [r("Prestige Group", "https://www.prestigeconstructions.com/"), r("Godrej Properties", "https://www.godrejproperties.com/"), r("Lodha", "https://www.lodhagroup.com/")] },
  { id: "education", label: "Education & edtech", theme: "studio", layout: "list", hero: "split",
    feel: "friendly and energetic, bright blue or yellow, courses and batches with timings and fees shown plainly, encouraging copy; no result or rank claims",
    sites: [r("Physics Wallah", "https://www.pw.live/"), r("Unacademy", "https://unacademy.com/"), r("upGrad", "https://www.upgrad.com/")] },
  { id: "travel", label: "Travel & hospitality", theme: "craft", layout: "lookbook", hero: "full",
    feel: "big destination and room photos, warm inviting colours, dreamy but honest copy; packages or rooms with prices and how to book",
    sites: [r("MakeMyTrip", "https://www.makemytrip.com/"), r("Taj Hotels", "https://www.tajhotels.com/"), r("OYO", "https://www.oyorooms.com/")] },
  { id: "electronics", label: "Electronics & appliances", theme: "bazaar", layout: "grid", hero: "split",
    feel: "clean product-on-white photos, one vivid accent, punchy short copy; key specs as the description; colour or model as choices",
    sites: [r("boAt", "https://www.boat-lifestyle.com/"), r("Noise", "https://www.gonoise.com/"), r("Atomberg", "https://atomberg.com/")] },
  { id: "footwear", label: "Footwear", theme: "bazaar", layout: "grid", hero: "split",
    feel: "shoe-first photos on a plain backdrop, bold fresh colour, simple copy; sizes as choices",
    sites: [r("Neeman's", "https://neemans.com/"), r("Campus", "https://www.campusshoes.com/"), r("Bata", "https://www.bata.in/")] },
  { id: "logistics", label: "Logistics & transportation", theme: "studio", layout: "list", hero: "split",
    feel: "trustworthy blue or orange, vehicles and routes, services and coverage areas explained simply, quote or call to book",
    sites: [r("Delhivery", "https://www.delhivery.com/"), r("Blue Dart", "https://www.bluedart.com/"), r("Porter", "https://porter.in/")] },
  { id: "packaging", label: "Packaging & paper", theme: "bazaar", layout: "list", hero: "split",
    feel: "practical and clean, neutral kraft and white with one accent, product types, sizes and minimum orders; quotation based",
    sites: [r("UFlex", "https://www.uflexltd.com/"), r("TCPL Packaging", "https://www.tcpl.in/"), r("ITC Paperboards", "https://www.itcpspd.com/")] },
  { id: "pharma", label: "Pharmaceuticals", theme: "studio", layout: "list", hero: "split",
    feel: "clinical clean white and blue or green, precise and sober copy; product ranges and contact for orders; never make health claims",
    sites: [r("Sun Pharma", "https://sunpharma.com/"), r("Dr. Reddy's", "https://www.drreddys.com/"), r("Cipla", "https://www.cipla.com/")] },
  { id: "fintech", label: "Banking & fintech", theme: "studio", layout: "list", hero: "split",
    feel: "modern, minimal and trustworthy, deep blue or black with one bright accent, clear plain-language services; never promise returns or rates",
    sites: [r("Razorpay", "https://razorpay.com/"), r("Groww", "https://groww.in/"), r("CRED", "https://cred.club/")] },
  { id: "jewellery-diamonds", label: "Jewellery & diamonds", theme: "craft", layout: "lookbook", hero: "full",
    feel: "traditional gold and deep red or royal tones, big ornament photos, heritage-style warm copy; weight and purity only if the owner said them",
    sites: [r("Titan", "https://www.titancompany.in/"), r("Kalyan Jewellers", "https://www.kalyanjewellers.net/"), r("Malabar Gold & Diamonds", "https://www.malabargoldanddiamonds.com/")] },
  { id: "interiors", label: "Interior design & architecture", theme: "craft", layout: "lookbook", hero: "full",
    feel: "large finished-room photos, calm neutral palette, thoughtful minimal copy; services and a clear way to book a consultation",
    sites: [r("Livspace", "https://www.livspace.com/"), r("HomeLane", "https://www.homelane.com/"), r("Asian Paints", "https://www.asianpaints.com/")] },
  { id: "cleaning", label: "Cleaning & household products", theme: "fresh", layout: "grid", hero: "split",
    feel: "fresh whites, aqua and green, clean pack photos, simple practical copy; pack sizes as choices",
    sites: [r("Beco", "https://www.beco.co.in/"), r("Vim", "https://www.vim.com/"), r("Gala", "https://www.galaindia.com/")] },
  { id: "pet-care", label: "Pet care", theme: "fresh", layout: "grid", hero: "split",
    feel: "friendly and playful, bright warm colours, happy pet photos, caring copy; food and accessories by pet type and size",
    sites: [r("Supertails", "https://supertails.com/"), r("Heads Up For Tails", "https://headsupfortails.com/"), r("Drools", "https://drools.com/")] },
  { id: "sports-fitness", label: "Sports & fitness", theme: "studio", layout: "grid", hero: "full",
    feel: "high-energy action photos, dark with one vivid accent, short motivating copy; classes or plans with timings and fees",
    sites: [r("Cult", "https://www.cult.fit/"), r("Decathlon", "https://www.decathlon.in/"), r("HRX", "https://www.hrxbrand.com/")] },
  { id: "toys-kids", label: "Toys & children's products", theme: "bazaar", layout: "grid", hero: "split",
    feel: "cheerful bright primary colours, playful friendly copy, product photos on clean backgrounds; age group as a choice",
    sites: [r("FirstCry", "https://www.firstcry.com/"), r("Hamleys", "https://www.hamleys.in/"), r("Smartivity", "https://www.smartivity.in/")] },
  { id: "wedding-events", label: "Wedding & event management", theme: "boutique", layout: "lookbook", hero: "full",
    feel: "romantic big event photos, blush, ivory and gold, warm celebratory copy; packages and a clear way to enquire; price on request",
    sites: [r("WedMeGood", "https://www.wedmegood.com/"), r("WeddingWire", "https://www.weddingwire.in/"), r("Ferns N Petals", "https://www.fnp.com/")] },
  { id: "energy-electrical", label: "Renewable energy & electrical", theme: "studio", layout: "list", hero: "split",
    feel: "clean sky blue and sun yellow or green, installation photos, practical benefits explained simply; quotation based; no savings claims",
    sites: [r("Tata Power", "https://www.tatapower.com/"), r("Waaree", "https://waaree.com/"), r("Suzlon", "https://www.suzlon.com/")] },
  { id: "dairy", label: "Dairy & milk products", theme: "fresh", layout: "grid", hero: "split",
    feel: "white, blue and fresh green, pure and simple, product pack photos, plain copy; daily or subscription style items with pack sizes",
    sites: [r("Amul", "https://www.amul.com/"), r("Country Delight", "https://countrydelight.in/"), r("Milky Mist", "https://www.milkymist.com/")] },
  { id: "watches", label: "Watches & luxury", theme: "boutique", layout: "lookbook", hero: "full",
    feel: "dark, minimal and premium, one watch per big photo, sparse refined copy; model and strap or colour as choices",
    sites: [r("Fastrack", "https://www.fastrack.in/"), r("Ethos Watches", "https://www.ethoswatches.com/"), r("Rado", "https://www.rado.com/")] },
  { id: "handicrafts", label: "Handicrafts & handmade products", theme: "craft", layout: "lookbook", hero: "split",
    feel: "earthy handmade warmth, textured natural colours, photos of the craft and the maker, personal story-led copy; only the story the owner told",
    sites: [r("Jaypore", "https://www.jaypore.com/"), r("Okhai", "https://okhai.org/"), r("iTokri", "https://itokri.com/")] },
  { id: "stationery-printing", label: "Printing, publishing & stationery", theme: "bazaar", layout: "grid", hero: "split",
    feel: "clean and practical, bright accent, product and sample photos, simple copy; sizes, paper and quantity as choices",
    sites: [r("Classmate", "https://www.classmateshop.com/"), r("Printo", "https://printo.in/"), r("Notion Press", "https://notionpress.com/")] },
  { id: "water-purifier", label: "Water purification", theme: "studio", layout: "grid", hero: "split",
    feel: "clear aqua blue and white, purifier on a clean backdrop, reassuring plain copy; models, service and installation shown simply; no health claims",
    sites: [r("Kent", "https://www.kent.co.in/"), r("Eureka Forbes", "https://www.eurekaforbes.com/"), r("Livpure", "https://livpure.com/")] },
  { id: "flowers-gifting", label: "Flowers & gifting", theme: "craft", layout: "grid", hero: "split",
    feel: "fresh petal colours, bouquet and gift-box close-ups, warm celebratory copy; occasion, size and add-ons as choices",
    sites: [r("Ferns N Petals", "https://www.fnp.com/"), r("IGP", "https://www.igp.com/"), r("FlowerAura", "https://www.floweraura.com/")] },
  { id: "perfumes", label: "Perfumes & fragrances", theme: "boutique", layout: "lookbook", hero: "full",
    feel: "moody and sensual, deep tones with gold, bottle-first photos, evocative short copy; bottle size as a choice",
    sites: [r("Bella Vita", "https://bellavitaorganic.com/"), r("Skinn", "https://www.skinn.in/"), r("Ajmal", "https://in.ajmal.com/")] },
  { id: "luggage-bags", label: "Luggage & bags", theme: "bazaar", layout: "grid", hero: "split",
    feel: "clean product photos on a plain backdrop, modern muted colours with one accent, practical copy; size and colour as choices",
    sites: [r("Mokobara", "https://mokobara.com/"), r("Safari", "https://safaribags.com/"), r("American Tourister", "https://www.americantourister.in/")] },
  { id: "eyewear", label: "Eyewear", theme: "boutique", layout: "grid", hero: "split",
    feel: "frames shown clearly on a clean backdrop, modern and light, helpful simple copy; frame colour as a choice; eye-test booking if offered",
    sites: [r("Lenskart", "https://www.lenskart.com/"), r("Titan Eye+", "https://www.titaneyeplus.com/"), r("Specsmakers", "https://specsmakers.in/")] },
  { id: "haircare", label: "Haircare", theme: "boutique", layout: "grid", hero: "split",
    feel: "soft natural greens or neutrals, bottle and texture photos, gentle honest copy about what each product is for; no cure claims",
    sites: [r("Arata", "https://www.arata.in/"), r("Bare Anatomy", "https://www.bareanatomy.com/"), r("Mamaearth", "https://mamaearth.in/")] },
  { id: "building-materials", label: "Building materials", theme: "bazaar", layout: "list", hero: "split",
    feel: "solid and dependable, grey with one strong accent, product types, sizes and grades; bulk orders and delivery area; quotation based",
    sites: [r("UltraTech Cement", "https://www.ultratechcement.com/"), r("Kajaria Ceramics", "https://www.kajariaceramics.com/"), r("JSW Cement", "https://www.jswcement.in/")] },
  { id: "industrial-automation", label: "Industrial automation", theme: "studio", layout: "list", hero: "split",
    feel: "technical but clear, white and teal or deep green, product families and what each does in plain words; contact an engineer; quotation based",
    sites: [r("Siemens", "https://www.siemens.com/"), r("ABB", "https://global.abb/"), r("Schneider Electric", "https://www.se.com/")] },
  { id: "telecom", label: "Telecom & internet", theme: "studio", layout: "list", hero: "split",
    feel: "bold brand colour, plans listed plainly with price and what is included, quick contact or recharge, simple direct copy",
    sites: [r("Airtel", "https://www.airtel.in/"), r("Jio", "https://www.jio.com/"), r("ACT Fibernet", "https://www.actcorp.in/")] },
  { id: "recruitment", label: "Recruitment & HR", theme: "studio", layout: "list", hero: "split",
    feel: "professional and approachable, blue or purple, services for employers and for job seekers explained simply, clear contact; no placement guarantees",
    sites: [r("Naukri", "https://www.naukri.com/"), r("Foundit", "https://www.foundit.in/"), r("Instahyre", "https://www.instahyre.com/")] },
  { id: "waste-management", label: "Waste management", theme: "fresh", layout: "list", hero: "split",
    feel: "clean greens and earth tones, practical and responsible, what is collected or recycled and where, simple copy; quotation or pickup booking",
    sites: [r("Re Sustainability", "https://resustainability.com/"), r("Antony Waste", "https://www.antony-waste.com/"), r("Nepra", "https://nepra.co.in/")] },
  { id: "marine-shipping", label: "Marine & shipping", theme: "studio", layout: "list", hero: "full",
    feel: "deep navy and sea blue, ships and ports in wide photos, formal and dependable copy; services and routes, contact for a quote",
    sites: [r("Shipping Corporation of India", "https://www.shipindia.com/"), r("Great Eastern Shipping", "https://www.greatship.com/"), r("Cochin Shipyard", "https://cochinshipyard.in/")] },
];

// The first guesses above, corrected by what the scan actually saw.
export const INDUSTRIES: Industry[] = BASE.map((b) => {
  const sc = SCAN[b.id];
  return { ...b, theme: sc.theme ?? b.theme, hero: sc.hero ?? b.hero, accent: sc.accent, read: sc.read, seen: sc.note };
});

export const INDUSTRY_IDS = INDUSTRIES.map((i) => i.id) as [string, ...string[]];

// Places to find more brands to add to the list above.
export const DISCOVERY_DIRECTORIES: Reference[] = [
  r("DTC Connect", "https://dtcconnect.in/categories"),
  r("Discovering Brands", "https://discoveringbrands.com/"),
  r("D2C Story", "https://www.d2cstory.com/categories/"),
  r("Garment Industry Directory", "https://www.garmentindustry.in/companies/"),
];

export function industryById(id: string | null | undefined): Industry | null {
  return INDUSTRIES.find((i) => i.id === id) ?? null;
}

// One compact line per industry for the planning prompt.
export function referencePrompt(): string {
  const lines = INDUSTRIES.map((i) => {
    const colour = THEMES[i.theme].palettes[i.accent].name;
    return `- ${i.id} (${i.label}) — inspired by ${i.sites.map((s) => s.name).join(", ")}. Start from theme ${i.theme} with colour option ${i.accent} (${colour}), layout ${i.layout}, hero ${i.hero}. Seen on ${i.read} of 3 of their sites: ${i.seen} Feel: ${i.feel}.`;
  });
  return `REFERENCE WEBSITES — what good sites in each kind of business look like. Pick the ONE industry id below that is closest to this business (or "other" if none fits). Then design the way those reference brands do: use the suggested theme, layout and banner style as your starting point, use the suggested colour option unless the owner asks otherwise, and follow the feel for photo style and tone of voice. The owner's own words and photos always win over these defaults (for example, if they ask for green, or say they sell only a few items). Take the approach, never the content: do not copy or mention any reference brand's name, logo, slogan, text, offers or claims, and do not claim anything the owner didn't say.
${lines.join("\n")}`;
}

// The design a new site gets. The planner names the industry; its theme, colour, layout and banner are
// applied here in code, unless the owner asked for a particular style (then the planner's own choices
// stand) or uploaded product photos that a text-only menu would hide.
export type Design = { id: ThemeId; accent: number; layout: Layout; heroStyle: "full" | "split"; industry?: string };

export function designFor(
  plan: { industry: string; ownerStyleRequest: boolean; themeId: ThemeId; accent: number; layout: Layout; heroStyle: "full" | "split" },
  ownPhotos: boolean,
): Design {
  const ind = industryById(plan.industry);
  const use = !!ind && !plan.ownerStyleRequest;
  const layout = use ? ind.layout : plan.layout;
  return {
    id: use ? ind.theme : plan.themeId,
    accent: use ? ind.accent : plan.accent,
    layout: layout === "menu" && ownPhotos ? "grid" : layout,
    heroStyle: use ? ind.hero : plan.heroStyle,
    industry: ind ? ind.id : undefined,
  };
}
