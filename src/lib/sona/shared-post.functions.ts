import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export interface SharedPostCard {
  post: {
    id: string;
    user_id: string;
    body: string;
    media_type: string;
    image_path: string | null;
    audience: string;
    disclosures: unknown;
    disclosure_note: string | null;
    labels: unknown;
    created_at: string;
  };
  author: { id: string; display_name: string; handle: string | null };
  mediaUrl: string | null;
}

/** Public link card: the database only returns public-account, Public Feed, shareable, untiered posts. */
export const getSharedPost = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.id)) throw new Error("Bad link");
    return d;
  })
  .handler(async ({ data }): Promise<SharedPostCard | null> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: card, error } = await sb.rpc("shared_post_card", { _post: data.id });
    if (error || !card) return null;
    const c = card as unknown as Omit<SharedPostCard, "mediaUrl">;
    let mediaUrl: string | null = null;
    if (c.post.image_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = await supabaseAdmin.storage.from("post-media").createSignedUrl(c.post.image_path, 60 * 60);
      mediaUrl = signed.data?.signedUrl ?? null;
    }
    return { ...c, mediaUrl };
  });
