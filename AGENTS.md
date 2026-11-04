<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Social privacy is enforced in the database (follows table + SECURITY DEFINER helpers `can_view_gallery`, `reaches_public_feed`, `are_friends`, `profile_card`); `src/lib/sona/social.ts` mirrors those rules for UI copy and tests — change both together.
- Other people's profiles are read only through the `profile_card` / `people_cards` / `search_profiles` functions, never by widening `profiles` SELECT, because that row holds care profile, settings and passcode.
- Post and profile media live in private buckets served via signed URLs (`useSignedUrl`), because the workspace blocks public buckets.
