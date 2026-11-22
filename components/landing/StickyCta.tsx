"use client";
// Phones only (see landing.css): a "Make my website" button pinned to the bottom of the screen once the main
// buttons have scrolled out of sight, so the owner can start from any part of the long page.
import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@/components/I18nProvider";

export function StickyCta() {
  const [heroSeen, setHeroSeen] = useState(true); // the hero buttons are on screen
  const [finalSeen, setFinalSeen] = useState(false); // the big closing button is on screen
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watch = (selector: string, set: (v: boolean) => void) => {
      const el = document.querySelector(selector);
      if (!el) return undefined;
      const io = new IntersectionObserver(([e]) => set(e.isIntersecting), { threshold: 0.2 });
      io.observe(el);
      return io;
    };
    const a = watch(".lp-hero .lp-ctas", setHeroSeen);
    const b = watch(".lp-final .lp-ctas", setFinalSeen);
    return () => {
      a?.disconnect();
      b?.disconnect();
    };
  }, []);
  const show = !heroSeen && !finalSeen;
  return (
    <div className={`lp-sticky ${show ? "on" : ""}`} aria-hidden={!show}>
      <Link href="/create" className="lp-pill block" tabIndex={show ? 0 : -1}>
        <T k="makeMyWebsite" />
      </Link>
    </div>
  );
}
