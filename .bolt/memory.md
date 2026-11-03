# Project memory

## Product intent & audience

- Social/feed product centered on intentional media use, personal “vibe” topics, accountability, and user-created posts.
- Users can manage profiles, discover posts, and understand why content is surfaced.
- Trust and transparency are core: post disclosures, Loud/Quiet labeling, “See why” explanations, and daily-use limits.

## Brand personality & voice

- Supportive, transparent, and non-judgmental.
- Accountability should feel gentle rather than punitive; daily-limit messaging should explain the state and offer a clear next step.
- Prefer plain-language labels and explanations over opaque system behavior.

## Visual design & UX direction

- Preserve the existing product patterns while extending navigation and content flows.
- Make disclosure requirements explicit during post creation:
  - Edited content
  - Filters
  - Paid partnerships
- Show Loud or Quiet status clearly on relevant posts.
- Provide a “See why” bubble/action that explains why a post was boosted or shown.
- Profile should support:
  - Description
  - Public/private control
  - Post gallery
  - Prominent Post action
- Vibe needs an input for user-entered topics or hashtags; connect it to the feed’s existing matching/boosting behavior.
- Daily-limit intervention should be visible when the limit is reached, while retaining a gentle option to continue if that is the intended product behavior.
- Ensure all new controls, links, cards, and states have working click-throughs and useful empty/error states.
- Responsive and accessible behavior should follow the existing app conventions; labels and limit states must not rely on color alone.

## Decisions, constraints & rationale

- Project framework: Vite + React.
- Requested remaining scope:
  1. Add an Accountability link to the top menu; its destination currently opens from Settings.
  2. Enforce the daily limit when reached. The limit is already saved and displayed, but currently does not stop or gate usage.
  3. Add the Vibe topic/hashtag input and connect it to existing feed boosting.
  4. Expand Profile with description, visibility switch, post gallery, and Post button.
  5. Add Makerspace post creation with required disclosures, Loud/Quiet labels, and “See why.”
  6. Verify click-throughs for all additions.
- Likely implementation dependency: profile and Makerspace work require posts to be persisted so galleries and feed content can use the same data.
- A practical implementation sequence proposed so far is Accountability navigation, daily-limit enforcement, Vibe input, Profile, Makerspace, then click-through verification. This sequence is a suggestion, not a confirmed user decision.
- Existing behavior to preserve and integrate:
  - Daily usage minutes and limit are already tracked/saved and shown.
  - Feed boosting for matching topics already exists.
  - Accountability currently has an entry point through Settings.
- No code changes have been made based on this request yet.
- Browser-level verification may need to be performed in the project preview; code inspection alone cannot confirm every interaction.

## Open questions & assumptions

- Confirm whether reaching the daily limit should fully block use, show an interstitial, or allow an explicit “continue” override; the earlier proposal assumed a gentle stop screen with a continue option.
- Identify the current persistence layer/schema and authentication model before defining profile and post data changes.
- Determine whether “public/private” controls the whole profile, individual posts, or both.
- Clarify exact semantics of Loud versus Quiet and whether users choose one label per post.
- Define what qualifies as an edit, filter, or paid partnership and whether each disclosure is mandatory as a checkbox, selector, or confirmation.
- Decide what “See why” explains (topic match, vibe preference, ranking signal, or other factors) and how much detail is appropriate.
- Confirm whether Vibe accepts free text, hashtags, or both, plus normalization, duplicates, removal, and save behavior.
- Confirm whether the Post button appears only on the user’s own profile and where Makerspace creation is launched.
- Validate all requested flows in a running preview after implementation.