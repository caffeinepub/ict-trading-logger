# Specification

## Summary
**Goal:** Allow natural typing of commas and spaces in the “Options (comma-separated)” input within the Custom Tool Manager’s Custom Property editor without characters being stripped during entry.

**Planned changes:**
- Adjust the “Options (comma-separated)” label/input behavior so the input preserves the user’s raw text while typing (including commas, spaces, multi-word entries, and trailing separators).
- Parse the input into the underlying options array only at a non-disruptive time (e.g., on blur and/or on save), splitting by commas and trimming surrounding whitespace per option while preserving multi-word options.
- Ensure select-property validation still requires at least one parsed option, without interfering with the typing experience.

**User-visible outcome:** Users can type option lists like “New York, Los Angeles, London” into the Options field without commas/spaces disappearing mid-entry, and the system correctly saves them as separate options split by commas.
