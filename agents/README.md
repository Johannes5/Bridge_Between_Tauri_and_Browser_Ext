Agents Workspace
================

This folder organizes design docs, conversations, progress notes, and bug reports for the Agents project. It is intentionally markdown‑first so it works well in any editor and can evolve alongside the code.

Contents
--------
- `agents/specs` — Specifications and design docs
  - `agent_overview.md` — High‑level overview and goals
  - `agent_action_spec.md` — Action/Tooling agent spec
  - `agent_search_spec.md` — Search/retrieval agent spec
  - `gpt5_conversation_1.md` — Conversation transcript (exploration)
  - `gpt5_conversation_2.md` — Conversation transcript (iteration)
- `agents/bugs` — Known issues and investigations
  - `action_agent_bugs.md`
  - `search_agent_bugs.md`
- `agents/progress` — Milestones, weekly updates, and notes
  - `milestone_october.md`
  - `search_agent_progress.md`

How We Work
-----------
- Keep documents short, scoped, and actionable. Prefer linking to details rather than repeating them.
- Use relative links between files (e.g., `../specs/agent_overview.md`).
- File naming: lowercase with underscores; one concept per file.
- Record decisions with a short “Decision” block and date.
- Prefer examples. When proposing changes, include before/after snippets.

Suggested Workflow
------------------
1. Start with `specs/agent_overview.md` to outline goals, constraints, and key components.
2. Add or refine specs (e.g., `agent_action_spec.md`, `agent_search_spec.md`).
3. Capture exploratory dialogues in the `gpt5_conversation_*.md` files to preserve reasoning and alternatives.
4. Track open problems in `bugs/*` and link back to the relevant spec sections.
5. Note milestones and status in `progress/*` with clear acceptance criteria.

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
