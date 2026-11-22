// A small helper character who hurries while the owner waits (after a recording: "writing down what you said",
// then "checking what you said"). Drawn in code (SVG parts moved by CSS, see app/hustle.css), in the Peacock & Gold
// palette, with no words in it: the page's own label says what is happening.
//   variant "run"   : sprinting flat out (sweat, dust, speed lines)
//   variant "carry" : sprinting while balancing a tall stack of papers on the head; a sheet flutters off now and then
// The run cycle follows the references we studied: both feet leave the ground (flight phase), the body dips on contact
// and rises in the air, arms swing opposite to the legs. Everything is decorative (aria-hidden); with reduced motion
// the character just stands.

type Props = { variant?: "run" | "carry"; mini?: boolean; className?: string };

const SKIN = "#F0B07A";
const SKIN_FAR = "#D99A66";
const PANTS = "#08394D";
const PANTS_FAR = "#052B3A";
const TEAL = "#0E8F8F";
const PEACOCK = "#0B5D7A";
const GOLD = "#D9A441";
const GOLD_DARK = "#A87B22";
const INK = "#0D2B36";

function Arm({ cls, skin, up }: { cls: string; skin: string; up?: boolean }) {
  return (
    <g className={`hg-arm ${cls} ${up ? "hg-arm-up" : ""}`}>
      <line x1="100" y1="80" x2="100" y2="97" stroke={skin} strokeWidth="7" strokeLinecap="round" />
      <g className="hg-fore">
        <line x1="100" y1="97" x2="100" y2="113" stroke={skin} strokeWidth="6.5" strokeLinecap="round" />
        <circle cx="100" cy="114" r="4.6" fill={skin} />
      </g>
    </g>
  );
}

function Leg({ cls, pants, shoe }: { cls: string; pants: string; shoe: string }) {
  return (
    <g className={`hg-thigh ${cls}`}>
      <line x1="100" y1="106" x2="100" y2="128" stroke={pants} strokeWidth="10" strokeLinecap="round" />
      <g className="hg-shin">
        <line x1="100" y1="128" x2="100" y2="149" stroke={pants} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="105" cy="153" rx="9.5" ry="4.8" fill={shoe} />
      </g>
    </g>
  );
}

export function Hustle({ variant = "run", mini, className }: Props) {
  const carry = variant === "carry";
  return (
    <svg className={`hg hg-${variant} ${mini ? "hg-mini" : ""} ${className ?? ""}`} viewBox="0 -18 220 186" aria-hidden="true" focusable="false">
      {/* ground that streams past, and the shadow that shrinks while airborne */}
      <line className="hg-ground" x1="6" y1="159" x2="214" y2="159" />
      <ellipse className="hg-shadow" cx="102" cy="160" rx="21" ry="3.2" />

      {/* speed lines and dust (behind the runner) */}
      <g className="hg-speed">
        <line x1="62" y1="86" x2="40" y2="86" />
        <line x1="66" y1="104" x2="38" y2="104" />
        <line x1="64" y1="122" x2="46" y2="122" />
      </g>
      <circle className="hg-dust d1" cx="78" cy="154" r="4" />
      <circle className="hg-dust d2" cx="78" cy="154" r="4" />

      <g className="hg-bob">
        <Leg cls="hg-far" pants={PANTS_FAR} shoe={GOLD_DARK} />
        <Leg cls="hg-near" pants={PANTS} shoe={GOLD} />

        <g className="hg-upper">
          <Arm cls="hg-far" skin={SKIN_FAR} />
          {/* torso with a gold sash */}
          <rect x="84" y="70" width="32" height="42" rx="15" fill={TEAL} />
          <path d="M86 78 L112 104" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
          {!carry && <Arm cls="hg-near" skin={SKIN} />}

          {/* head */}
          <circle cx="102" cy="52" r="18" fill={SKIN} />
          <circle cx="96" cy="51" r="5.6" fill="#fff" />
          <circle cx="110" cy="51" r="5.6" fill="#fff" />
          <circle className="hg-pupil" cx="98.2" cy="52" r="2.7" fill={INK} />
          <circle className="hg-pupil" cx="112.2" cy="52" r="2.7" fill={INK} />
          <path d="M90 43 L100 46 M105 46 L116 43" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <ellipse className="hg-mouth" cx="106" cy="64" rx="3.6" ry="2.8" fill={INK} />
          <circle cx="112" cy="58" r="2.6" fill="#E88C7A" opacity="0.7" />

          {/* turban with a gold band and a peacock feather */}
          <path d="M82 46 Q84 28 102 28 Q121 28 123 46 Q103 40 82 46 Z" fill={PEACOCK} />
          <path d="M82.5 45 Q103 39 122.5 45" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none" />
          <g className="hg-feather">
            <path d="M112 31 Q122 20 130 22" stroke={TEAL} strokeWidth="3" strokeLinecap="round" fill="none" />
            <ellipse cx="132" cy="22" rx="5.5" ry="3.6" fill={TEAL} transform="rotate(-12 132 22)" />
            <ellipse cx="132.5" cy="22" rx="2.6" ry="1.8" fill={GOLD} transform="rotate(-12 132.5 22)" />
          </g>

          {/* carrying: the near arm reaches up past the cheek to steady the stack, so it is drawn over the head */}
          {carry && <Arm cls="hg-near" skin={SKIN} up />}

          {/* the sweat */}
          <path className="hg-sweat s1" d="M81 38 q-3 5 0 7 q3 -2 0 -7 z" fill="#4FD1C5" />
          <path className="hg-sweat s2" d="M124 56 q-3 5 0 7 q3 -2 0 -7 z" fill="#4FD1C5" />

          {carry && (
            <g className="hg-stack">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} className={`hg-paper p${i}`} x={86 + (i % 2 ? 3 : -1)} y={25 - i * 5.2} width="34" height="5" rx="1.2" fill="#fff" stroke={INK} strokeWidth="1.1" />
              ))}
              <rect className="hg-flyer" x="88" y="-8" width="30" height="4.5" rx="1.2" fill="#fff" stroke={INK} strokeWidth="1.1" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
