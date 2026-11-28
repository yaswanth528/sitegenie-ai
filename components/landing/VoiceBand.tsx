"use client";
// Home-page band that introduces ordering by voice and links to the built-in demo shop (/p/demo).
// The wording lives here (English, Hindi, Kannada) and falls back to English for the other languages.
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

const COPY = {
  en: {
    kicker: "New: voice ordering",
    title: "Your customers can order by voice too.",
    body: "They say what they want, in English, Hindi or Kannada. SiteGenie shows what it heard as a list to check. Nothing goes in the cart until they confirm.",
    said: "You said",
    heard: "We heard",
    add: "Add to cart",
    cta: "Try the demo shop",
    note: "No sign-up. Type or speak an order.",
  },
  hi: {
    kicker: "नया: आवाज़ से ऑर्डर",
    title: "आपके ग्राहक भी बोलकर ऑर्डर कर सकते हैं।",
    body: "वे जो चाहिए बोलते हैं, अंग्रेज़ी, हिंदी या कन्नड़ में। SiteGenie जो सुना उसकी सूची जाँचने के लिए दिखाता है। ग्राहक के पक्का करने तक कुछ भी कार्ट में नहीं जाता।",
    said: "आपने कहा",
    heard: "हमने सुना",
    add: "कार्ट में डालें",
    cta: "डेमो दुकान आज़माएँ",
    note: "साइन-अप नहीं चाहिए। बोलकर या लिखकर ऑर्डर दें।",
  },
  kn: {
    kicker: "ಹೊಸದು: ಧ್ವನಿಯಿಂದ ಆರ್ಡರ್",
    title: "ನಿಮ್ಮ ಗ್ರಾಹಕರೂ ಮಾತನಾಡಿ ಆರ್ಡರ್ ಮಾಡಬಹುದು.",
    body: "ಅವರಿಗೆ ಬೇಕಾದದ್ದನ್ನು ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ ಹೇಳುತ್ತಾರೆ. SiteGenie ಕೇಳಿದ್ದನ್ನು ಪರಿಶೀಲಿಸಲು ಪಟ್ಟಿಯಾಗಿ ತೋರಿಸುತ್ತದೆ. ಗ್ರಾಹಕರು ಖಚಿತಪಡಿಸುವವರೆಗೆ ಯಾವುದೂ ಕಾರ್ಟ್‌ಗೆ ಹೋಗುವುದಿಲ್ಲ.",
    said: "ನೀವು ಹೇಳಿದ್ದು",
    heard: "ನಾವು ಕೇಳಿದ್ದು",
    add: "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
    cta: "ಡೆಮೊ ಅಂಗಡಿ ಪ್ರಯತ್ನಿಸಿ",
    note: "ಸೈನ್-ಅಪ್ ಬೇಡ. ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ಆರ್ಡರ್ ಮಾಡಿ.",
  },
} as const;

export function VoiceBand() {
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  return (
    <section className="lp-voice" id="voice-order">
      <div className="lp-inner lp-voice-grid">
        <div className="lp-voice-text">
          <p className="lp-kicker">{c.kicker}</p>
          <h2>{c.title}</h2>
          <p className="lp-sub">{c.body}</p>
          <div className="lp-ctas lp-voice-cta">
            <Link href="/p/demo" className="lp-pill">
              {c.cta}
            </Link>
          </div>
          <p className="lp-voice-note">{c.note}</p>
        </div>
        <div className="lp-voice-card" aria-hidden="true">
          <p className="lp-voice-label">{c.said}</p>
          <p className="lp-voice-said">&ldquo;two cotton sarees and one printed kurti&rdquo;</p>
          <p className="lp-voice-label">{c.heard}</p>
          <div className="lp-voice-row"><span>Cotton saree &times; 2</span><b>&#8377;2,400</b></div>
          <div className="lp-voice-row"><span>Printed kurti &times; 1</span><b>&#8377;899</b></div>
          <div className="lp-voice-add">{c.add}</div>
        </div>
      </div>
    </section>
  );
}
