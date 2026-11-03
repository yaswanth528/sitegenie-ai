import Link from "next/link";
import { FeatureTile, FinalGlow, Greatest, HeroSub, HeroTitle, Kicker, MotionProvider, ShopMarquee } from "@/components/landing/Bits";
import { Reveal } from "@/components/landing/Reveal";
import { TalkButton } from "@/components/CustomEnquiry";
import { LanguageSwitcher, T } from "@/components/I18nProvider";
import { Logo } from "@/components/Logo";
import { SiteView } from "@/components/site/SiteView";
import { DEMO, DEMO_MENU, DEMO_STORE } from "@/lib/demo";
import { PRICES } from "@/lib/prices";
import type { UiKey } from "@/lib/uitext";
import { whatsappLoginReady } from "@/lib/whatsapp";
import "./landing.css";

const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// A real SiteGenie website, drawn at true phone size and scaled into a frame.
function Phone({ dynamic = false, tilt, site = DEMO, className = "" }: { dynamic?: boolean; tilt?: "left" | "right"; site?: typeof DEMO; className?: string }) {
  return (
    <div className={`lp-phone ${tilt ? `tilt-${tilt}` : ""} ${className}`} aria-hidden="true">
      <div className="lp-phone-screen">
        <div className="lp-phone-inner">
          <SiteView site={site === DEMO ? { ...DEMO, siteType: dynamic ? "dynamic" : "static" } : site} preview />
        </div>
      </div>
    </div>
  );
}

const FEATURES: { id: number; dark?: boolean; wide?: boolean }[] = [
  { id: 1, dark: true, wide: true },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6, wide: true },
  { id: 7 },
  { id: 8 },
  { id: 9 },
  { id: 10 },
];

export default function Home() {
  return (
    <MotionProvider>
    <div className="lp">
      <Reveal />
      <header className="lp-nav">
        <div className="lp-nav-row">
          <Logo />
          <nav aria-label="Sections">
            <a href="#how"><T k="navHow" /></a>
            <a href="#designs"><T k="navDesigns" /></a>
            <a href="#pricing"><T k="navPricing" /></a>
          </nav>
          <div className="lp-nav-cta">
            <LanguageSwitcher />
            {whatsappLoginReady() && (
              <Link href="/login" className="lp-link">
                <T k="navLogin" />
              </Link>
            )}
            <Link href="/create" className="lp-pill sm">
              <T k="makeMyWebsite" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-glow" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          {/* Example moments from SiteGenie floating around the headline (illustrations, not real data). */}
          <div className="lp-floaters" aria-hidden="true">
            <div className="lp-float f1">
              <span className="lp-float-icon wave">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>
                <small><T k="fl1Small" /></small><T k="fl1Text" />
              </span>
            </div>
            <div className="lp-float f2">
              <span className="lp-float-icon ok">✓</span>
              <span>
                <small><T k="fl2Small" /></small>yourshop.pages.dev
              </span>
            </div>
            <div className="lp-float f3">
              <span className="lp-float-icon">₹</span>
              <span>
                <small><T k="fl3Small" /></small><T k="fl3Text" />
              </span>
            </div>
            <div className="lp-float f4">
              <span className="lp-float-icon dot" />
              <span>
                <small><T k="fl4Small" /></small><T k="fl4Text" />
              </span>
            </div>
            <div className="lp-float f5">
              <span className="lp-float-icon">+</span>
              <span>
                <small><T k="fl5Small" /></small><T k="fl5Text" />
              </span>
            </div>
            <div className="lp-float f6">
              <span className="lp-float-icon">⇄</span>
              <span>
                <small><T k="fl6Small" /></small>English · ಕನ್ನಡ
              </span>
            </div>
          </div>
          <div className="lp-sparks" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ ["--x" as string]: `${(i * 37) % 100}%`, ["--d" as string]: `${(i % 7) * 1.1}s`, ["--t" as string]: `${7 + (i % 5)}s` }} />
            ))}
          </div>
          <Kicker k="heroKicker" />
          <HeroTitle />
          <HeroSub k="heroSub" />
          <div className="lp-ctas" data-reveal>
            <Link href="/create" className="lp-pill">
              <T k="makeMyWebsite" />
            </Link>
            <a href="#how" className="lp-pill ghost">
              <T k="seeHow" />
            </a>
          </div>
          <div className="lp-hero-device" data-reveal>
            <div className="lp-hero-row">
              <Phone site={DEMO_STORE} className="side left" />
              <Phone className="main" />
              <Phone site={DEMO_MENU} className="side right" />
            </div>
          </div>
        </section>

        <ShopMarquee />

        <section className="lp-dark" id="how">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              <T k="howKicker" />
            </p>
            <h2 data-reveal>
              <T k="howTitle1" />
              <br />
              <span className="lp-dim"><T k="howTitle2" /></span>
            </h2>
            <div className="lp-flow">
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">01</span>
                <h3><T k="step1Title" /></h3>
                <p><T k="step1Body" /></p>
                <div className="lp-wave" aria-hidden="true">
                  {Array.from({ length: 28 }, (_, i) => (
                    <i key={i} style={{ animationDelay: `${(i % 7) * 0.12}s` }} />
                  ))}
                </div>
              </div>
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">02</span>
                <h3><T k="step2Title" /></h3>
                <p><T k="step2Body" /></p>
                <div className="lp-chips" aria-hidden="true">
                  <span><T k="chipTheme" /></span>
                  <span><T k="chipPhotos" /></span>
                  <span><T k="chipPrices" /></span>
                  <span><T k="chipHours" /></span>
                </div>
              </div>
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">03</span>
                <h3><T k="step3Title" /></h3>
                <p><T k="step3Body" /></p>
                <div className="lp-link-demo" aria-hidden="true">
                  <span>●</span> yourshop.pages.dev
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-designs" id="designs">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              <T k="designsKicker" />
            </p>
            <h2 data-reveal>
              <T k="designsTitle1" />
              <br />
              <Greatest><T k="designsTitle2" /></Greatest>
            </h2>
            <div className="lp-duo">
              <div className="lp-duo-col" data-reveal>
                <Phone tilt="left" />
                <h3><T k="showcase" /></h3>
                <p><T k="showcaseBody" /></p>
                <p className="lp-price"><T k="priceOneTime" vars={{ price: rs(PRICES.static) }} /></p>
              </div>
              <div className="lp-duo-col best" data-reveal>
                <Phone dynamic tilt="right" />
                <h3><T k="customSite" /></h3>
                <p><T k="customBody" /></p>
                <p className="lp-price"><T k="letsTalk" /></p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-features">
          <div className="lp-inner">
            <h2 data-reveal>
              <T k="featTitle1" />
              <br />
              <span className="lp-dim"><T k="featTitle2" /></span>
            </h2>
            <div className="lp-bento">
              {FEATURES.map((f) => (
                <div key={f.id} className={`lp-tile-wrap ${f.wide ? "wide" : ""}`} data-reveal>
                  <FeatureTile wide={f.wide} dark={f.dark} title={<T k={`f${f.id}t` as UiKey} />} body={<T k={`f${f.id}b` as UiKey} />} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-pricing" id="pricing">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              <T k="pricingKicker" />
            </p>
            <h2 data-reveal><T k="pricingTitle" /></h2>
            <div className="lp-plans">
              <div className="lp-plan" data-reveal>
                <h3><T k="showcase" /></h3>
                <p className="lp-plan-price">{rs(PRICES.static)}</p>
                <p className="lp-plan-note"><T k="oneTime" /></p>
                <ul>
                  <li><T k="pl1" /></li>
                  <li><T k="pl2" /></li>
                  <li><T k="pl3" /></li>
                  <li><T k="pl4" /></li>
                </ul>
                <Link href="/create" className="lp-pill ghost block">
                  <T k="startShowcase" />
                </Link>
              </div>
              <div className="lp-plan best" data-reveal>
                <span className="lp-badge"><T k="madeForYou" /></span>
                <h3><T k="customSite" /></h3>
                <p className="lp-plan-price"><T k="letsTalk" /></p>
                <p className="lp-plan-note"><T k="customNote" /></p>
                <ul>
                  <li><T k="cl1" /></li>
                  <li><T k="cl2" /></li>
                  <li><T k="cl3" /></li>
                  <li><T k="cl4" /></li>
                </ul>
                <TalkButton className="lp-pill block" labelKey="talkToUs" from="home" />
              </div>
            </div>
            <p className="lp-fine" data-reveal>
              <T k="pricingFine" />
            </p>
          </div>
        </section>

        <section className="lp-final">
          <FinalGlow />
          <div className="lp-inner">
            <h2 data-reveal><T k="finalTitle" /></h2>
            <p className="lp-sub" data-reveal>
              <T k="finalSub" />
            </p>
            <div className="lp-ctas" data-reveal>
              <Link href="/create" className="lp-pill light">
                <T k="makeMyWebsite" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-inner lp-footer-row">
          <span><T k="footerTag" /></span>
          <span>
            <Link href="/privacy"><T k="privacy" /></Link>
            <Link href="/terms"><T k="terms" /></Link>
          </span>
        </div>
      </footer>
    </div>
    </MotionProvider>
  );
}
