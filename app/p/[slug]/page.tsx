import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteView } from "@/components/site/SiteView";
import { VisitPing } from "@/components/VisitPing";
import { contentOf } from "@/lib/catalogue";
import { jsonLd, ogImageUrl } from "@/lib/seo";
import { DEMO_SLUG } from "@/lib/demo";
import { getPublicSite } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getPublicSite((await params).slug);
  if (!s) return {};
  const o = await origin();
  const image = { url: ogImageUrl(o, s), width: 1200, height: 630, alt: s.businessName };
  const description = s.subheadline || `Order from ${s.businessName} on WhatsApp`;
  return {
    title: s.slug === DEMO_SLUG ? "Demo shop: try Order by voice" : s.businessName,
    description,
    ...(s.slug === DEMO_SLUG ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: s.live?.url ?? `${o}/p/${s.slug}` },
    openGraph: { title: s.businessName, description, images: [image], type: "website", siteName: s.businessName },
    twitter: { card: "summary_large_image", title: s.businessName, description, images: [image.url] },
  };
}

export default async function SitePage({ params }: Props) {
  const s = await getPublicSite((await params).slug);
  if (!s) notFound();
  const o = await origin();
  const demo = s.slug === DEMO_SLUG;
  return (
    <>
      {demo && (
        <div style={{ background: "#08394d", color: "#f6fafa", padding: "10px 16px", font: "600 14px/1.4 system-ui, sans-serif", textAlign: "center" }}>
          Demo shop. Tap <b>Order by voice</b> in the products section and say or type an order, such as &ldquo;two cotton sarees and one printed kurti&rdquo;. Nothing here is sent to anyone.
        </div>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(s, s.live?.url ?? `${o}/p/${s.slug}`, o) }} />
      {!demo && <VisitPing slug={s.slug} />}
      <SiteView site={{ ...contentOf(s), whatsapp: s.whatsapp, slug: s.slug }} />
    </>
  );
}
