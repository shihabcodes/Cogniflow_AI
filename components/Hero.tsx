"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { BUTTON, BUTTON_PRIMARY, LABEL } from "./ui";

/** First-visit screen: pitch, one-click demo, and a live "indexing" visual. */
export default function Hero({ onTryDemo, onAddSource, busy }: { onTryDemo: () => void; onAddSource: () => void; busy: boolean }) {
  return (
    <section className="relative flex min-h-0 flex-1 overflow-hidden border-b border-border" aria-labelledby="hero-title">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <SignalField className="pointer-events-none absolute inset-0 h-full w-full opacity-35 lg:left-1/2 lg:w-1/2 lg:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent lg:via-background/40" aria-hidden />

      <div className="relative flex w-full flex-col justify-between gap-10 px-5 py-10 sm:px-10 lg:py-14">
        <div className="max-w-xl pt-4 lg:pt-16">
          <p className={LABEL}>// RAG for video, audio &amp; documents</p>
          <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Every answer, traced to the second.
          </h1>
          <p className="mt-5 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
            Add YouTube videos, podcasts or PDFs. Ask anything. Every claim is cited, and video citations jump to the exact moment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onTryDemo} disabled={busy} className={BUTTON_PRIMARY}>
              Try the demo <ArrowRight className="size-4" aria-hidden />
            </button>
            <button onClick={onAddSource} className={`${BUTTON} min-h-11 px-4`}>
              Add your own source
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">No sign-up. No API key needed to try it.</p>
        </div>

        <dl className="grid max-w-xl grid-cols-3 border-t border-border pt-6">
          {[
            ["4", "Source types"],
            ["<1s", "Demo answers"],
            ["0", "Sign-ups needed"],
          ].map(([value, label], i) => (
            <div key={label} className={`flex flex-col ${i ? "border-l border-border pl-4 sm:pl-6" : "pr-4"}`}>
              <dt className="order-2 mt-1 text-xs text-muted-foreground sm:text-sm">{label}</dt>
              <dd className="font-mono text-2xl sm:text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const TRACES = [
  [0.05, 0.22, 0.4],
  [0.3, 0.47, 0.55],
  [0.1, 0.71, 0.3],
  [0.55, 0.86, 0.4],
];
const GLYPHS = ["00:12", "01:02", "02:11", "03:19", "[1]", "[2]", "[3]", "0x3f", "▸", "▮", "│", "┼", "·", "embed", "chunk", "cite"];

/**
 * Columns of timestamps and citation markers drifting down while a scan line sweeps across,
 * like a transcript being indexed. Throttled to ~30 fps, paused when hidden, static under reduced motion.
 */
function SignalField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COL = 22;
    let w = 0,
      h = 0,
      cols: { y: number; speed: number; glyphs: string[]; bright: number }[] = [];

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Array.from({ length: Math.ceil(w / COL) }, () => ({
        y: Math.random() * h,
        speed: 0.4 + Math.random() * 1.6,
        glyphs: Array.from({ length: 14 }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]),
        bright: Math.random(),
      }));
    };

    let scan = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px 'JetBrains Mono Variable', monospace";
      cols.forEach((c, i) => {
        if (c.bright < 0.15) return; // a few gaps, like sparse terminal columns
        const x = i * COL;
        c.glyphs.forEach((g, j) => {
          const y = (c.y + j * 16) % (h + 240) - 120;
          const near = Math.abs(y - scan) < 22;
          const a = (j / c.glyphs.length) * (0.35 + c.bright * 0.65);
          ctx.fillStyle = near ? `rgba(255,120,110,${Math.min(1, a + 0.5)})` : `rgba(220,38,38,${a})`;
          ctx.fillText(g.length > 3 ? g.slice(0, 1) : g, x, y);
          // Every so often a full timestamp reads horizontally off the column.
          if (j === 9 && c.bright > 0.8) ctx.fillText(` ${GLYPHS[i % 4]}`, x + 8, y);
        });
        c.y += c.speed;
      });
      // Thin fixed traces, like circuit lines.
      ctx.fillStyle = "rgba(220,38,38,0.28)";
      for (const [fx, fy, fw] of TRACES) ctx.fillRect(fx * w, fy * h, fw * w, 1);
      // Horizontal scan line with a few "locked" timestamps.
      ctx.fillStyle = "rgba(220,38,38,0.55)";
      ctx.fillRect(0, scan, w, 1);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`▸ ${GLYPHS[(scan / 40) % 4 | 0]}  cited`, w * 0.18, scan - 6);
      scan = (scan + 1.2) % h;
    };

    resize();
    if (still) {
      scan = h * 0.45;
      draw();
      return;
    }

    let raf = 0,
      last = 0,
      visible = true;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || t - last < 33) return;
      last = t;
      draw();
    };
    raf = requestAnimationFrame(loop);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
