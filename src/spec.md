# Specification

## Summary
**Goal:** Add calendar-based trade review, side-by-side comparisons, and a customizable analytics dashboard, while upgrading trade notes to support tags/labels and persisting screenshots via backend blob storage.

**Planned changes:**
- Extend trade reflection data to include quickTags[], mistakeTags[], and strengthTags[] while keeping existing notes text, mood, and images; ensure older trades default new fields to empty arrays.
- Replace frontend data-URL screenshot storage with backend blob storage; store only stable screenshot references in Trade.images, support removal, and keep scope to screenshots only (no voice notes).
- Add a Calendar month-grid view in navigation that aggregates trades per day (P/L, adherence summary, model summary, tags/notes/screenshot indicators) and lets users open a day’s trade list and navigate to trade details.
- Add a Comparison view in navigation with two independently configurable panels (model/session/setup/adherence/date range), including week/month quick picks and custom start/end, rendering mirrored KPIs and charts using existing analytics utilities.
- Add analytics dashboard customization: choose modules to show/hide, reorder, and persist layout per user in the backend; preserve existing analytics filters and default layout behavior.
- Apply a consistent visual theme across Calendar/Comparison/Dashboard customization UI (English text, Tailwind/Shadcn-compatible), avoiding a blue/purple-dominant palette.

**User-visible outcome:** Users can upload and persist trade screenshots, add quick tags and categorized mistake/strength labels to trades, review performance in a month-grid calendar with per-day summaries, compare two datasets side-by-side with mirrored analytics, and personalize the analytics dashboard layout with saved per-user preferences.
