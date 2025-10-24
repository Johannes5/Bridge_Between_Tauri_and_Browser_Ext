Agents Workspace
================

Contents
--------
- `agents/specs` — Specifications and design docs
 - `agents/progress` — Milestones, weekly updates, and notes
 
How We Work
-----------
- Keep documents short, scoped, and actionable. Prefer linking to details rather than repeating them.
- Use relative links between files (e.g., `../specs/agent_overview.md`).
- File naming: lowercase with underscores; one concept per file.
- Record decisions with a short “Decision” block and date.
- Prefer examples. When proposing changes, include before/after snippets.

Suggested Workflow
------------------
1. Start with `specs/agent_overview.md` to outline goals, constraints, and key components. assuming it exists
2. Add or refine specs
3. Note milestones and status in `progress/*` with clear acceptance criteria.

as the project progresses, dont just write to progress notes, but refine documenation. which is outside the agents folder

Spec Template (Copy/Paste)
--------------------------
Title
~~~~~
- Problem: What user outcome is blocked today?
- Goals: What must be true when done?
- Non‑Goals: What is explicitly out of scope?

Design
~~~~~~
- Architecture: Components and data flow.
- Protocols/Interfaces: Inputs, outputs, and contracts.
- Risks: Edge cases and failure modes.

Plan
~~~~
- Milestones: Small, verifiable steps.
- Validation: How we’ll test and measure success.

Open Questions
~~~~~~~~~~~~~~
- …

Links
~~~~~
- Related specs:
- Conversations:
- Issues:

Next Steps
----------
- Fill in `specs/agent_overview.md` with the initial project narrative.
- Prioritize the first milestone in `progress/milestone_october.md`.
- Triage any known issues into `bugs/*` and link them from the relevant spec sections.
