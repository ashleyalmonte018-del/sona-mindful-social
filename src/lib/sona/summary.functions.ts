import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One calm, neutral sentence so a "Label only" post can be judged before viewing. */
export const summarizePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().min(1).max(2000), flags: z.array(z.string().max(40)).max(10).default([]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You write content labels for a mental-health-forward teen social app. Summarize the post in ONE calm, neutral sentence of at most 25 words so the reader can decide whether to view it. Name sensitive themes plainly (e.g. diet talk, breakup, scary news) without graphic detail. Never quote the post, never use emojis, never add advice.",
        input: `Post: """${data.text}"""${data.flags.length ? `\nKnown themes: ${data.flags.join(", ")}` : ""}`,
      });
      const out = res as unknown as { output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
      const text =
        out.output_text ??
        (out.output ?? [])
          .flatMap((o) => (o.type === "message" ? (o.content ?? []) : []))
          .filter((c) => c.type === "output_text")
          .map((c) => c.text ?? "")
          .join("")
          .trim();
      return { summary: text || null };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("summarizePost failed", e.code, e.message);
        return { summary: null };
      }
      throw e;
    }
  });
