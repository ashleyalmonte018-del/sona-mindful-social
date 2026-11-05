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
- Site theme (preset / custom colour / light-dark) is stored in `profiles.settings.theme`, applied to `<html>` by `applyTheme` in `src/lib/sona/theme.ts` (data-theme attribute, `.dark` class, inline vars for custom), and cached in localStorage for the pre-hydration script in `__root`; palettes live in `src/styles.css` so components keep using semantic tokens.
- Circle members (mutual follows) and their Sona/share are read only through the `circle_sonas()` function; circle tiers live in `circle_tier_members` (owner-only, insert requires `are_friends`), so members never see how they're tiered.
- Age mode ids are `sapling` (under 13), `sprout` (teens), `bloom` (18+); all under-13 guardrails key off `sapling`.
