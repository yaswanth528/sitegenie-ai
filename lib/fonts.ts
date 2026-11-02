// Fonts for the website themes. next/font self-hosts them; a face is only downloaded
// by the browser when a theme actually uses it.
import {
  Archivo,
  Baloo_2,
  Cormorant_Garamond,
  Fraunces,
  Hind,
  Jost,
  Manrope,
  Mulish,
  Noto_Sans_Devanagari,
  Noto_Sans_Bengali,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Nunito_Sans,
  Playfair_Display,
  Sora,
} from "next/font/google";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-cormorant", display: "swap" });
const jost = Jost({ subsets: ["latin"], variable: "--f-jost", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--f-fraunces", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--f-nunito", display: "swap" });
const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--f-baloo", display: "swap" });
const hind = Hind({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-hind", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--f-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-manrope", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--f-playfair", display: "swap" });
const mulish = Mulish({ subsets: ["latin"], variable: "--f-mulish", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--f-archivo", display: "swap" });
// Indian scripts, used as fallbacks in every theme so Kannada and Hindi copy renders well.
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], variable: "--f-kannada", display: "swap" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], variable: "--f-malayalam", display: "swap" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--f-bengali", display: "swap" });
const gujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], variable: "--f-gujarati", display: "swap" });
const gurmukhi = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], variable: "--f-gurmukhi", display: "swap" });
const oriya = Noto_Sans_Oriya({ subsets: ["oriya"], variable: "--f-oriya", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--f-tamil", display: "swap" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--f-telugu", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--f-devanagari", display: "swap" });

export const fontVariables = [cormorant, jost, fraunces, nunito, baloo, hind, sora, manrope, playfair, mulish, archivo, kannada, devanagari, tamil, telugu, malayalam, bengali, gujarati, gurmukhi, oriya]
  .map((f) => f.variable)
  .join(" ");
