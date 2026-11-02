// Draws a .biscuit circuit (the drawn circuits of spark) as an SVG schematic in
// the colours of the site. Used for the hero until there is a real screenshot.
// Supports the parts the samples use: Wire, Resistor, Capacitor, Diode, Ground,
// AudioInput, Scope; Text elements are left out.

const U = 10; // px per grid unit

const fmtValue = (el) => {
  if (el.resistance) return el.resistance.replace(/^([\d.]+)\s*([kMm]?)$/, (_, n, p) => `${n} ${p}Ω`);
  if (el.capacitance) return el.capacitance.replace(/^([\d.]+)\s*([pnuµm]?)F$/, (_, n, p) => `${n} ${p === "u" ? "µ" : p}F`);
  return el.model ?? el.amplitude ?? "";
};

export function biscuitSvg(json, { scopeWidth = 22 } = {}) {
  const b = typeof json === "string" ? JSON.parse(json) : json;
  // scopes are drawn narrower than in spark, so the circuit gets the space
  const elements = b.elements.map((e) => (e.type === "Scope" ? { ...e, to: [e.from[0] + scopeWidth, e.to[1]] } : e));
  // vertical parts, to put labels on the side where there is room
  const verticalX = elements.filter((e) => e.type !== "Wire" && e.from[0] === e.to[0]).map((e) => e.from[0]);
  const parts = [];
  const ends = new Map();
  const key = ([x, y]) => `${x},${y}`;
  const touch = (p) => ends.set(key(p), (ends.get(key(p)) ?? 0) + 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = ([x, y], pad = 0) => {
    minX = Math.min(minX, x - pad); minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad); maxY = Math.max(maxY, y + pad);
  };

  const P = ([x, y]) => [x * U, y * U];
  const line = (a, b, cls = "w") => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;

  for (const el of elements) {
    if (el.type === "Text") continue;
    const A = P(el.from), B = P(el.to);
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const L = Math.hypot(dx, dy) || 1;
    const u = [dx / L, dy / L], n = [-u[1], u[0]];
    const at = (s, t = 0) => [A[0] + u[0] * s + n[0] * t, A[1] + u[1] * s + n[1] * t]; // s along, t across
    const m = L / 2;
    const vertical = Math.abs(dy) > Math.abs(dx);
    const label = (text, sub) => {
      const crowded = vertical && verticalX.some((x) => x > el.from[0] && x - el.from[0] <= 6);
      const [x, y] = vertical ? [A[0] + (crowded ? -14 : 14), A[1] + dy / 2 - 2] : [A[0] + dx / 2, A[1] - 29];
      const anchor = vertical ? (crowded ? "end" : "start") : "middle";
      return `<text class="lbl" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>` +
        (sub ? `<text class="val" x="${x}" y="${y + 15}" text-anchor="${anchor}">${sub}</text>` : "");
    };
    grow(el.from, 2); grow(el.to, 2);

    switch (el.type) {
      case "Wire":
        touch(el.from); touch(el.to);
        parts.push(line(A, B));
        break;
      case "Resistor": {
        touch(el.from); touch(el.to);
        const bl = Math.min(L * 0.5, 50), s0 = m - bl / 2, steps = 6;
        const pts = [at(s0)];
        for (let i = 0; i < steps; i++) pts.push(at(s0 + (bl / steps) * (i + 0.5), i % 2 ? -6 : 6));
        pts.push(at(s0 + bl));
        parts.push(line(A, at(s0)), line(at(s0 + bl), B),
          `<polyline class="c" points="${pts.map((p) => p.join(",")).join(" ")}"/>`, label(el.name, fmtValue(el)));
        break;
      }
      case "Capacitor": {
        touch(el.from); touch(el.to);
        const g = 4;
        parts.push(line(A, at(m - g)), line(at(m + g), B),
          line(at(m - g, -12), at(m - g, 12), "c thick"), line(at(m + g, -12), at(m + g, 12), "c thick"), label(el.name, fmtValue(el)));
        break;
      }
      case "Diode": {
        touch(el.from); touch(el.to);
        const h = 8;
        parts.push(line(A, at(m - h)), line(at(m + h), B),
          `<polygon class="c fill" points="${[at(m - h, -9), at(m - h, 9), at(m + h)].map((p) => p.join(",")).join(" ")}"/>`,
          line(at(m + h, -9), at(m + h, 9), "c thick"), label(el.name, fmtValue(el)));
        break;
      }
      case "Ground": {
        touch(el.from);
        parts.push(line(A, B), line(at(L, -10), at(L, 10), "c"), line(at(L + 4, -6), at(L + 4, 6), "c"), line(at(L + 8, -2), at(L + 8, 2), "c"));
        break;
      }
      case "AudioInput": {
        touch(el.from); touch(el.to);
        grow([Math.min(el.from[0], el.to[0]) - 8, el.from[1]]); // room for the name on the left
        const r = 14, c = at(m);
        const wave = Array.from({ length: 17 }, (_, i) => {
          const t = i / 16;
          return [c[0] - 8 + t * 16, c[1] - Math.sin(t * Math.PI * 2) * 5].join(",");
        }).join(" ");
        parts.push(line(A, at(m - r)), line(at(m + r), B),
          `<circle class="c" cx="${c[0]}" cy="${c[1]}" r="${r}"/>`, `<polyline class="c" points="${wave}"/>`,
          `<text class="lbl" x="${c[0] - 22}" y="${c[1] + 4}" text-anchor="end">${el.name}</text>`);
        break;
      }
      case "Scope": {
        const [x0, y0] = A, [x1, y1] = B;
        const w = x1 - x0, h = y1 - y0, mid = y0 + h / 2;
        // a sine for the input; a clipped, rounded wave behind the diodes
        const clipped = el.probe !== "Input";
        const wave = Array.from({ length: 121 }, (_, i) => {
          const t = i / 120;
          let v = Math.sin(t * Math.PI * 6);
          if (clipped) v = Math.tanh(v * 3.2) / Math.tanh(3.2) * 0.55;
          return [x0 + 6 + t * (w - 12), mid - v * (h / 2 - 10)].join(",");
        }).join(" ");
        parts.push(`<rect class="scope" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6"/>`,
          `<line class="axis" x1="${x0 + 6}" y1="${mid}" x2="${x1 - 6}" y2="${mid}"/>`,
          `<polyline class="trace${clipped ? " t2" : ""}" points="${wave}"/>`,
          `<text class="val" x="${x0 + 8}" y="${y0 + 14}">${el.probe}</text>`);
        break;
      }
    }
  }

  // ports of the class (e.g. Out at the first pin of C1)
  for (const port of b.ports ?? []) {
    const [name, pin] = port.pin.split(".");
    const el = elements.find((e) => e.name === name);
    if (!el) continue;
    const p = P(pin === "2" ? el.to : el.from);
    parts.push(`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${port.color ?? "#ff4070"}"/>`,
      `<text class="port" x="${p[0] + 9}" y="${p[1] - 9}" fill="${port.color ?? "#ff4070"}">${port.name}</text>`);
  }
  // junction dots
  for (const [k, count] of ends) {
    if (count < 3) continue;
    const [x, y] = k.split(",").map(Number);
    parts.push(`<circle class="dot" cx="${x * U}" cy="${y * U}" r="3.5"/>`);
  }

  const pad = 1;
  const vb = [(minX - pad) * U, (minY - pad) * U, (maxX - minX + 2 * pad) * U, (maxY - minY + 2 * pad) * U];
  return `<svg class="biscuit" viewBox="${vb.join(" ")}" role="img" aria-label="Circuit ${b.class ?? ""}">
<style>
.biscuit .w{stroke:#8a8199;stroke-width:2.5;fill:none;stroke-linecap:round}
.biscuit .c{stroke:#ece8f3;stroke-width:2.5;fill:none;stroke-linejoin:round;stroke-linecap:round}
.biscuit .thick{stroke-width:3}
.biscuit .fill{fill:#ece8f3}
.biscuit .dot{fill:#8a8199}
.biscuit text{font:600 14px ui-monospace,Menlo,Consolas,monospace;fill:#ece8f3}
.biscuit .val{font-weight:400;fill:#8a8199}
.biscuit .port{font-weight:700}
.biscuit .scope{fill:#0b0910;stroke:#3a3247;stroke-width:1.5}
.biscuit .axis{stroke:#2c2636;stroke-width:1}
.biscuit .trace{stroke:#f8a820;stroke-width:2.5;fill:none}
.biscuit .t2{stroke:#ff4070}
</style>
${parts.join("\n")}
</svg>`;
}
