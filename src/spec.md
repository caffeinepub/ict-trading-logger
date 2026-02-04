# Specification

## Summary
**Goal:** Add private, per-user Custom Tool Definitions that can be created and managed by a user and then used in the Model Builder alongside built-in tools.

**Planned changes:**
- Add backend canister support for user-owned Custom Tool Definitions (create/update/delete/get-by-id/list for caller), enforcing existing RBAC/ownership patterns (owner-only, admin access; reject anonymous; prevent changing owner).
- Define and persist a Custom Tool Definition model that describes a tool’s Properties schema (select/text/number/toggle), including labels, default values, and select options.
- Add React Query hooks for custom tools (list/create/update/delete) using existing actor-based patterns, with stable caching and invalidation so the Tool Palette refreshes after mutations and refetches on identity/actor changes.
- Extend the Model Builder Tool Palette to show the caller’s custom tools alongside built-in tools, support selecting/placing them into zones using the existing flow, and display human-readable names for custom tool types.
- Add a frontend UI flow to create/edit/delete custom tools, including a form to define tool name and an editable/reorderable Properties field list with validation.
- Update tool configuration rendering so custom tool instances generate their Properties UI from the custom tool definition schema, while built-in tools continue using existing configs.

**User-visible outcome:** A signed-in user can create, edit, and delete their own private custom tools (properties-only), see them in the Tool Palette, place them into model zones like built-in tools, and configure their properties via a generated Properties tab; other non-admin users cannot see these custom tools.
