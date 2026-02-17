# Specification

## Summary
**Goal:** Keep the Model Builder Tool Palette button always visible and usable on mobile while scrolling through zones, including clear placement-mode status and an easy way to cancel.

**Planned changes:**
- Update the mobile Model Builder layout to use a sticky or floating Tool Palette trigger that remains visible while scrolling Narrative / Framework / Execution zones.
- Ensure the always-visible trigger respects mobile safe-area insets and avoids obscuring critical UI (zone content, save controls).
- Add a persistent visual indicator on the trigger when a tool is selected for placement (placement mode active).
- Provide an always-accessible control on mobile to cancel placement mode, clearing the selected tool and returning to normal interaction.
- Preserve existing Tool Palette behavior and layout on non-mobile viewports; tapping the trigger opens the existing Tool Palette sheet as before.

**User-visible outcome:** On mobile, users can scroll through Model Builder zones and still open the Tool Palette at any time; when a tool is selected, they can always see placement mode is active and can cancel it without scrolling back.
