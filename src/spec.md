# Specification

## Summary
**Goal:** Replace the Trade Logger modal with an inline Trade Logger experience embedded directly within the Trades (Trade Journal) page.

**Planned changes:**
- Remove modal/dialog behavior for the Trade Logger so it no longer opens as an overlay.
- Render the existing Trade Logger create/edit UI inline within the Trades (Trade Journal) page layout.
- Update the Trades page flow so “Log Trade” (including the Live Setup Identifier “Log Trade”) reveals the inline Trade Logger section and close/cancel returns to the normal Trade Journal list view on the same route.
- Adapt any Trade Logger styling/layout previously tied to Radix Dialog so the inline version is full-width, vertically stacked, responsive, and avoids horizontal overflow (including when dynamic model-adherence/conditions sections appear).

**User-visible outcome:** On the Trades page, clicking “Log Trade” opens the Trade Logger inline (no modal/backdrop), supports both create and edit as before (including preloaded model/observations from Live Setup Identifier), and can be closed to return to the Trade Journal list view without leaving the page.
