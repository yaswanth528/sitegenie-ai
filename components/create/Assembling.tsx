"use client";
// While the website is being built: a phone in which the page puts itself together, block by
// block, beside the steps. Real build time varies (20-60 s on the free Gemini tier), so the
// blocks follow the clock and the last step waits until the website arrives.
import { useEffect, useState } from "react";
import { useT } from "../I18nProvider";
import { Rotating } from "../Rotating";
import type { UiKey } from "@/lib/uitext";

const STEPS: UiKey[] = ["build1", "build2", "build3", "build4", "build5"];

export function Assembling({ withPhotos }: { withPhotos: boolean }) {
  const tr = useT();
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = STEPS.filter((s) => withPhotos || s !== "build3");
  const active = Math.min(steps.length - 1, Math.floor(t / 3));
  const stage = Math.min(6, t + 1); // how many blocks of the page have appeared (about one a second)
  return (
    <div className="cf-build" aria-live="polite">
      <div className="cf-build-stage" aria-hidden="true">
      <span className="cf-orbit">
        <i />
        <i />
        <i />
      </span>
      <div className="cf-build-phone">
        <div className="cf-build-screen" data-stage={stage}>
          <div className="b-bar" />
          <div className="b-hero">
            <i className="b-eyebrow" />
            <i className="b-h1" />
            <i className="b-h1 short" />
            <i className="b-btns" />
          </div>
          <div className="b-band" />
          <div className="b-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="b-card" style={{ ["--i" as string]: i }}>
                <i className="b-img" />
                <i className="b-line" />
                <i className="b-line short" />
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      <div className="cf-build-copy">
        <h1>{tr("buildingTitle")}</h1>
        <ol className="cf-steps">
          {steps.map((s, i) => (
            <li key={s} className={i < active ? "done" : i === active ? "now" : ""}>
              {tr(s)}
            </li>
          ))}
        </ol>
        <div className="cf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(95, Math.round((t / 45) * 100))}>
          <span style={{ width: `${Math.min(95, (t / 45) * 100)}%` }} />
        </div>
        <p className="cf-muted">{tr("buildUsually")}{t > 0 ? ` · ${t}s` : ""}</p>
        <Rotating
          className="cf-tip"
          every={4500}
          lines={[tr("tip1"), tr("tip2"), tr("tip3"), tr("tip4")]}
        />
      </div>
    </div>
  );
}
