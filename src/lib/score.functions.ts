import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  url: z.string().url(),
});

const ScoreSchema = z.object({
  productName: z.string(),
  oneLiner: z.string(),
  overallScore: z.number(),
  verdict: z.string(),
  scores: z.object({
    productThinking: z.object({ score: z.number(), critique: z.string() }),
    craft: z.object({ score: z.number(), critique: z.string() }),
    originality: z.object({ score: z.number(), critique: z.string() }),
    shippedness: z.object({ score: z.number(), critique: z.string() }),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  brutalRoast: z.string(),
  shipItOrKillIt: z.enum(["SHIP IT", "KILL IT", "FIX IT FIRST"]),
});

export type ShipScore = z.infer<typeof ScoreSchema>;

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ShipScoreBot/1.0; +https://shipscore.app)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "";
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "";
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
  return `URL: ${url}\nTITLE: ${title}\nMETA: ${desc}\nOG_TITLE: ${ogTitle}\nOG_DESC: ${ogDesc}\n\nVISIBLE TEXT:\n${body}`;
}

function extractJson(text: string): unknown {
  // Strip ```json fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  // Find first { ... last }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in model response");
  return JSON.parse(candidate.slice(start, end + 1));
}

export const scoreProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const pageContext = await fetchPageText(data.url);

    const gateway = createLovableAiGatewayProvider(apiKey);

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are a brutally honest, senior product judge with the taste of a Mind the Product head judge. You evaluate landing pages of new products by four equally-weighted criteria, each scored 0-25:

1. PRODUCT THINKING — Is the problem worth solving? Clear ICP, clear value, clear "why now"?
2. CRAFT & EXECUTION — Does the UI look considered? Is the copy intentional? Does it work end-to-end?
3. ORIGINALITY & AMBITION — Sharp, specific, surprising? Or another generic AI wrapper?
4. SHIPPEDNESS — Can a stranger get value RIGHT NOW? Real product or vaporware?

Overall score = sum of the four (0-100). Verdict rule: 75+ = "SHIP IT", 50–74 = "FIX IT FIRST", <50 = "KILL IT".

Be specific. Cite exact phrases from the page when possible. No hedging. No corporate filler. Witty but never mean for sport. If it's slop, say so. If it's brilliant, say so.

Respond with ONLY a single JSON object — no markdown, no commentary — matching this exact shape:

{
  "productName": string,
  "oneLiner": string,
  "overallScore": number (0-100),
  "verdict": string (2-3 sentences, the summary judgment),
  "scores": {
    "productThinking": { "score": number 0-25, "critique": string },
    "craft": { "score": number 0-25, "critique": string },
    "originality": { "score": number 0-25, "critique": string },
    "shippedness": { "score": number 0-25, "critique": string }
  },
  "strengths": string[] (3-5 items, short and specific),
  "weaknesses": string[] (3-5 items, short and specific),
  "brutalRoast": string (1-2 sentences, savage but earned),
  "shipItOrKillIt": "SHIP IT" | "KILL IT" | "FIX IT FIRST"
}`,
      prompt: `Evaluate this product's landing page and return the JSON object now:\n\n${pageContext}`,
    });

    const parsed = ScoreSchema.parse(extractJson(text));
    return JSON.parse(JSON.stringify(parsed)) as ShipScore;
  });
