# WordBloom through Mark Pincus's "Proven, Better, New"

A product-strategy lens on WordBloom's features, and the changes we made to
follow it.

## The framework

Mark Pincus (founder of Zynga; *Life at the Speed of Play*, 2026) frames winning
consumer products as a **strict sequence**:

1. **Proven** — faithfully copy what already works and is loved by the target
   audience ("every pixel"). This is the *bulk* of the product; it de-risks
   everything.
2. **Better** — improve one dimension so clearly that **10 out of 10** target
   users say "yes, I'd use this." Often something plain: less friction, a removed
   step, a lower price.
3. **New** — add *one* novel bet **last**, accepting it will *probably fail*.
   Because Proven + Better are solid, a failed New doesn't sink the product or
   read as a false negative.

The canonical failure — "**all new fails**" — is starting with New and skipping
Proven. Pincus also stresses **onboarding** as make-or-break.

## The mapping

| Feature | Bucket | Notes |
|---|---|---|
| Daily edition + streak + push reminder | **Proven** | Duolingo / Wordle habit loop. |
| Freemium paywall (Stripe) | **Proven** | Standard consumer subscription. |
| Progress charts + milestone share card | **Proven** | Duolingo year-in-review, Strava, baby-milestone apps. |
| "Said it!" tap-to-log + confetti | **Proven** | Gamified habit-tracker mechanic. |
| Magic-link auth | **Proven** | Slack / Notion / Medium pattern. |
| Research-backed credibility (CDI) | **Proven** | Trust pattern for health / parenting apps. |
| **Zero-effort, in-the-moment "what to say next"** | **Better** | The 10/10 better vs. the proven category — passive trackers + generic "talk to your baby" advice + flashcards. |
| Phonetic-scaffolding engine (sound → next-step word) | **New** | The genuine novelty — and the riskiest part. |
| Two-word combination coaching (pivot grammar) | **New** | Novel bet layered on top. |
| Deterministic per-child daily personalization | **New** | Novel; measurable via `phrase_views` + `words.source`. |

## Diagnosis

- **Proven** is now strong. The retention and trust layer (daily loop, progress,
  share, auth, research backing) faithfully mirrors what works elsewhere.
- **Better exists but was buried.** WordBloom's real 10/10 improvement over the
  category is *it removes the "what do I even say?" moment* — most apps track what
  your child says; WordBloom tells you the exact phrase to say next. The landing
  led with a category claim ("Grow your child's vocabulary") instead of this.
- **The New was doing double duty as the identity.** The phonetic engine — the
  riskiest, most novel part — was the pitch. That is precisely the inversion
  Pincus warns against ("all new fails").

## The Proven layer: copy Duolingo's skeleton, not its skin

Duolingo is the closest proven analog for the retention layer — but one asymmetry
decides what transfers: **Duolingo's user *is* the learner; WordBloom's user (the
parent) is not (the child)**, and the domain is high-anxiety ("is my child
developing normally?"). That flips the emotional valence of several mechanics.

| Duolingo mechanic | For WordBloom | Why |
|---|---|---|
| Bite-sized daily loop, trivially achievable goal | **Copy** (even lighter — ~20s) | The learning happens all day when the parent talks; the app is the *nudge*, not the lesson. |
| Free-first, genuinely usable free tier | **Copy** (watch the paywall) | The habit must form *before* the paywall. A too-thin free tier (1 phrase/day) starves the flywheel. Reserve premium for depth, not the habit. |
| Instant feedback = visible progress | **Copy** — this is "Said it!" | Manufactures the "correct answer!" dopamine Duolingo gets from grading. Our single most Duolingo-like mechanic; lean on it. |
| Value before signup | **Copy** — the try-it preview | See a phrase personalized to *their* child before entering an email. |
| Daily notification | **Adapt** — invert the tone | Same lever (their biggest), but warm and child-centered ("Maya's phrases are ready"), never guilt/loss ("you're falling behind"). |
| Streak | **Adapt** — celebratory only, forgiving | Frame around the child's momentum, not parent compliance. The weekly recap is the safer primitive; a breakable streak about your baby can read as judgment. |
| Leaderboards / competitive leagues | **Reject** | Comparing babies' word counts drives parental anxiety and is developmentally meaningless (huge normal range). This is why progress uses *ranges, never verdicts*. |
| Guilt / loss-aversion notifications | **Reject** | Beloved on Duolingo, corrosive in an anxiety domain. |

The relevant playbook is **early** Duolingo (free-first, bite-sized, habit,
onboarding) — not **mature** Duolingo (brand/TikTok virality, leagues,
monetization optimization), which is a later-stage distraction that mostly won't
fit the domain.

## What we changed

1. **Lead with the one 10/10 Better.** The landing hero now states the better in
   one line ("Never wonder what to say to your baby again") with a subhead that
   contrasts it against the proven alternative. (`src/routes/index.tsx`)
2. **Deliver the aha before commitment.** An inline "try it" step lets a parent
   enter their child's age and a word or two and *see a real personalized phrase
   immediately*, before signing up — the proven "show value first" onboarding.
   Reuses the existing client-side engine, no backend. (`src/routes/index.tsx` →
   `src/routes/setup.tsx` prefill)
3. **Guarantee a first-session win.** New users carry their previewed words into
   the dashboard, so the first screen already shows *their* phrase, and the empty
   state points straight at the first action. (`src/routes/dashboard.tsx`)
4. **Demote the New to "how it works."** The phonetic engine is reframed as the
   mechanism behind the Better, not the headline. Its effectiveness stays
   *measured* (`phrase_views`, `words.source='suggestion'`) — the discipline of
   treating novelty as a de-risked bet, so Proven + Better stand without it.

## What we deliberately did NOT do

- No fabricated social proof (the app has ~0 users) — real testimonials and
  counts come later.
- The New stays. This repositions and measures it; it does not remove it.
