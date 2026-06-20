import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { scoreProject, type ShipScore } from "@/lib/score.functions";
import { ArrowRight, Loader2, Skull, Wrench, Rocket, Flame } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ship Score — Brutally honest AI critique of your landing page" },
      {
        name: "description",
        content:
          "Paste a URL. Get a senior PM's brutal, scored critique of your product in 20 seconds.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [url, setUrl] = useState("");
  const scoreFn = useServerFn(scoreProject);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (u: string) => scoreFn({ data: { url: u } }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let v = url.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    mutation.mutate(v);
  };

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 md:pt-28 md:pb-16">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex h-2 w-2 rounded-full bg-hot animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Live • Judging mode
          </span>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight text-balance">
          Your landing page is{" "}
          <span className="italic text-hot">probably mid.</span>
          <br />
          Let's prove it.
        </h1>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground text-balance">
          Paste a URL. A senior product judge — modelled on the people who ship at Linear,
          Stripe, and Figma — will roast it, score it 0–100, and tell you whether to
          ship it, fix it, or kill it.
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              ↗
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstartup.com"
              autoFocus
              disabled={mutation.isPending}
              className="w-full h-14 pl-10 pr-4 bg-card border-2 border-ink rounded-md font-mono text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-hot focus:border-hot transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending || !url.trim()}
            className="h-14 px-8 bg-ink text-paper font-semibold rounded-md hover:bg-hot transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Judging…
              </>
            ) : (
              <>
                Roast it
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
          <span>try:</span>
          {["linear.app", "vercel.com", "notion.so"].map((s) => (
            <button
              key={s}
              onClick={() => setUrl(s)}
              className="underline underline-offset-4 hover:text-hot transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {mutation.isError && (
          <div className="mt-8 p-4 border-2 border-destructive bg-destructive/10 rounded-md max-w-2xl">
            <p className="font-mono text-sm text-destructive">
              ⚠ {(mutation.error as Error).message || "Something broke. Try another URL."}
            </p>
          </div>
        )}
      </section>

      {mutation.isPending && <SkeletonResult />}
      {mutation.data && <ScoreResult score={mutation.data} url={url} onReset={() => { mutation.reset(); setUrl(""); router.invalidate(); }} />}

      {!mutation.data && !mutation.isPending && <HowItWorks />}

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-ink/10">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-serif font-black text-xl">
          <img
            src="/__l5e/assets-v1/7a4e5d16-1823-445f-a871-e754920f1e08/shipscore-icon.png"
            alt="Ship Score logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          Ship&nbsp;Score
        </a>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground hidden sm:block">
          v1.0 · be brave
        </div>
      </div>
    </header>
  );
}

function SkeletonResult() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="border-2 border-ink rounded-lg p-8 bg-card">
        <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Fetching page → parsing copy → consulting the judge…
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-8 bg-muted rounded animate-pulse w-2/3" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    </section>
  );
}

function ScoreResult({ score, url, onReset }: { score: ShipScore; url: string; onReset: () => void }) {
  const verdict = score.shipItOrKillIt;
  const VerdictIcon =
    verdict === "SHIP IT" ? Rocket : verdict === "KILL IT" ? Skull : Wrench;
  const verdictColor =
    verdict === "SHIP IT"
      ? "bg-lime text-ink"
      : verdict === "KILL IT"
        ? "bg-destructive text-destructive-foreground"
        : "bg-hot text-hot-foreground";

  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="border-2 border-ink rounded-lg overflow-hidden bg-card">
        {/* Score header */}
        <div className="p-8 border-b-2 border-ink bg-paper">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Verdict for {url}
              </div>
              <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black text-balance">
                {score.productName}
              </h2>
              <p className="mt-2 text-muted-foreground italic">"{score.oneLiner}"</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="font-serif text-7xl md:text-8xl font-black leading-none">
                {score.overallScore}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div
                className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest font-bold ${verdictColor}`}
              >
                <VerdictIcon className="h-3.5 w-3.5" />
                {verdict}
              </div>
            </div>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-balance">{score.verdict}</p>
        </div>

        {/* Brutal roast */}
        <div className="p-8 border-b-2 border-ink bg-ink text-paper">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest opacity-70">
            <Flame className="h-3.5 w-3.5" /> The roast
          </div>
          <p className="mt-3 font-serif text-2xl md:text-3xl italic leading-snug text-balance">
            "{score.brutalRoast}"
          </p>
        </div>

        {/* Four scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink border-b-2 border-ink">
          <ScoreCard label="Product Thinking" score={score.scores.productThinking.score} critique={score.scores.productThinking.critique} />
          <ScoreCard label="Craft & Execution" score={score.scores.craft.score} critique={score.scores.craft.critique} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink border-b-2 border-ink">
          <ScoreCard label="Originality" score={score.scores.originality.score} critique={score.scores.originality.critique} />
          <ScoreCard label="Shippedness" score={score.scores.shippedness.score} critique={score.scores.shippedness.critique} />
        </div>

        {/* Strengths / weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink">
          <div className="p-8">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              What works
            </div>
            <ul className="mt-4 space-y-3">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-lime mt-1">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              What doesn't
            </div>
            <ul className="mt-4 space-y-3">
              {score.weaknesses.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-hot mt-1">−</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-6 bg-paper flex flex-wrap gap-3 items-center justify-between border-t-2 border-ink">
          <div className="font-mono text-xs text-muted-foreground">
            Judged by Gemini · 4-criteria rubric · ~20s
          </div>
          <button
            onClick={onReset}
            className="px-5 py-2.5 bg-ink text-paper font-semibold rounded-md hover:bg-hot transition-colors text-sm"
          >
            Roast another →
          </button>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ label, score, critique }: { label: string; score: number; critique: string }) {
  const pct = (score / 25) * 100;
  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="font-serif font-black text-3xl">
          {score}
          <span className="text-sm text-muted-foreground">/25</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-ink rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/80">{critique}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Paste a URL", d: "Yours, a competitor's, the one you can't stop thinking about." },
    { n: "02", t: "We fetch & read it", d: "Title, meta, copy, structure — the same signals a real user gets in 5 seconds." },
    { n: "03", t: "AI senior PM judges", d: "Four criteria, 0–25 each, no corporate hedging. Brutal where it needs to be." },
    { n: "04", t: "Ship, fix, or kill", d: "A clear verdict and the specific reasons. Use it. Or don't. Your funeral." },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24 pt-8 border-t border-ink/10">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">
        How it works
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
        {steps.map((s) => (
          <div key={s.n} className="bg-background p-6">
            <div className="font-mono text-xs text-hot">{s.n}</div>
            <h3 className="mt-3 font-serif font-bold text-xl">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 max-w-3xl">
        <h2 className="font-serif text-3xl md:text-4xl font-black text-balance">
          Built for product people who can take it.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg text-balance">
          Most landing-page feedback is either a $400 design consultant or your co-founder
          saying "yeah, looks good." Ship Score is the third option: instant, scored, and
          honest enough to actually be useful.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto max-w-5xl px-6 py-8 font-mono text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ship Score
      </div>
    </footer>
  );
}
