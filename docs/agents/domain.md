# Domain Docs

This repo uses a **single-context** layout.

## Files

- `CONTEXT.md` — domain glossary (create at repo root when first needed)
- `docs/adr/` — Architecture Decision Records (create when first needed)

## Consumer rules

- Always read `CONTEXT.md` before exploring domain-related code
- Check `docs/adr/` before proposing architectural changes
- Add new domain terms to `CONTEXT.md` inline as they crystallise during sessions
- Only create ADRs for decisions that are hard to reverse, surprising without context, and result from genuine trade-offs
