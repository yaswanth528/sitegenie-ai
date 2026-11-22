// A stick-figure runner who keeps the owner company while they wait (after a recording: "writing down what you said",
// then "checking what you said"). Drawn in the spirit of Chrome's offline dinosaur game: plain ink lines, two-frame
// running steps (not smooth tweening), a ground that scrolls past, cactuses to hop over. All SVG parts moved by CSS
// (see app/hustle.css). No words in it: the page's own label says what is happening.
//   variant "run"   : runs along and hops over a cactus every few seconds
//   variant "carry" : runs flat out balancing a stack of papers on its head, arms up; a sheet flutters off now and then
// Decorative only (aria-hidden); with reduced motion the figure just stands.

type Props = { variant?: "run" | "carry"; mini?: boolean; className?: string };

const TEAL = "#0E8F8F";

// Body anchor points (facing right): head centre, neck, hip. Ground is at y = 71.
const LEG_A = "57,47 67,56 73,64 M57,47 53,58 47,69"; // front foot lifted forward, back foot pushing off
const LEG_B = "57,47 62,58 66,70 M57,47 52,56 44,60"; // front foot landing, back foot kicked up
const LEG_JUMP = "57,47 66,54 71,61 M57,47 62,56 57,63"; // both knees tucked
const ARM_A = "60,31 67,36 72,30 M60,31 53,35 48,41";
const ARM_B = "60,31 66,38 72,43 M60,31 53,33 47,28";
const ARM_UP = "60,31 69,26 73,10 M60,31 51,26 52,10"; // hands on the paper stack
const ARM_JUMP = "60,31 67,25 72,18 M60,31 53,26 48,19";

function Lines({ d }: { d: string }) {
  // "x,y x,y x,y M x,y x,y ..." -> one polyline per limb
  return (
    <>
      {d.split("M").map((part) => (
        <polyline key={part} points={part.trim()} />
      ))}
    </>
  );
}

export function Hustle({ variant = "run", mini, className }: Props) {
  const carry = variant === "carry";
  const steady = carry || mini; // no cactus and no hop
  return (
    <svg
      className={`hg hg-${variant} ${mini ? "hg-mini" : ""} ${className ?? ""}`}
      viewBox={mini ? "34 8 56 66" : "0 -24 220 106"}
      aria-hidden="true"
      focusable="false"
    >
      {/* sky: a slow cloud */}
      {!mini && (
        <g className="hg-cloud">
          <path d="M0 -2 h5 q1 -6 7 -5 q4 -6 10 -1 q7 -1 7 6 z" />
        </g>
      )}

      {/* ground: a line, and bumps scrolling past at the same speed as the cactus */}
      <line className="hg-ground" x1="0" y1="71" x2="220" y2="71" />
      <line className="hg-bumps" x1="-40" y1="77" x2="260" y2="77" />

      {/* the cactus (run only): drifts in from the right, passes under the hop */}
      {!steady && (
        <g className="hg-cactus">
          <polyline points="0,71 0,52" />
          <polyline points="0,63 -6,63 -6,56" />
          <polyline points="0,59 6,59 6,53" />
        </g>
      )}

      <g className={steady ? "hg-bob" : "hg-hop"}>
        {/* head with a gold headband, torso */}
        <circle className="hg-head" cx="63" cy="19.5" r="7.5" />
        <path className="hg-band" d="M56.5 16.5 Q63 11.5 69.5 16.5" />
        <circle className="hg-eye" cx="66.2" cy="19" r="1.3" />
        <polyline points="61,27 57,47" />

        {/* running: two poses swap, like the dinosaur's two feet */}
        <g className={steady ? "hg-legs-steady" : "hg-legs-run"}>
          <g className="hg-pose-a">
            <Lines d={LEG_A} />
            {!carry && <Lines d={ARM_A} />}
          </g>
          <g className="hg-pose-b">
            <Lines d={LEG_B} />
            {!carry && <Lines d={ARM_B} />}
          </g>
        </g>
        {!steady && (
          <g className="hg-pose-jump">
            <Lines d={LEG_JUMP} />
            <Lines d={ARM_JUMP} />
          </g>
        )}

        {/* carrying: arms up on a stack of papers */}
        {carry && (
          <>
            <Lines d={ARM_UP} />
            <g className="hg-stack">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} className="hg-paper" x={50 + (i % 2 ? 4 : 0)} y={4 - i * 4.6} width="30" height="4" rx="0.8" />
              ))}
              <rect className="hg-flyer" x="52" y="-28" width="26" height="3.6" rx="0.8" />
            </g>
          </>
        )}

        {/* the sweat */}
        <path className="hg-sweat" d="M54 14 q-2.6 4 0 6 q2.6 -2 0 -6 z" fill={TEAL} stroke="none" />
      </g>
    </svg>
  );
}
