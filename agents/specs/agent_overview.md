Agents Project Overview
=======================

Decision (2025-10-20): Start with a two-agent architecture (Action + Search) orchestrated by a lightweight controller. Use MCP-compatible tools where possible.

Problem
-------
- Building reliable, “tool-using” assistants requires clear separation between reasoning, retrieval, and side-effectful actions.
- Ad hoc designs lead to brittle behaviors, unclear interfaces, and hard-to-measure progress.

Goals
-----
- Define a minimal, composable architecture for agents that can: retrieve context, decide on actions, call tools safely, and report progress.
- Provide clear specs for the Action Agent and Search Agent with testable contracts.
- Make iteration fast via markdown-first specs, examples, and conversation transcripts.

Non-Goals
---------
- Full production infra (authN/Z, rate-limiting, billing).
- Long-term memory beyond short session/state scopes.
- Model-specific prompt engineering beyond what is required to validate behaviors.

Use Cases
---------
- Execute multi-step tasks requiring external tools (Action Agent).
- Retrieve focused, high-signal context from local/project sources (Search Agent).
- Orchestrate both for end-to-end workflows (Controller/Orchestrator).

Architecture
------------
- Orchestrator: routes requests, maintains task state, and composes agents.
- Search Agent: focused retrieval from project/local sources; returns citations and compact summaries.
- Action Agent: plans and executes tool calls with guardrails and confirmations.
- Tools Layer: MCP-compatible tools where possible; deterministic wrappers for non-MCP tools.
- Memory/State: ephemeral task state + caller-provided context; no persistent long-term memory.
- Safety/Guardrails: confirmation gates for destructive actions; structured error handling.

Interfaces
----------
- Inputs: task description, constraints, available tools, initial context.
- Outputs: plan steps, retrieved context (with sources), tool call results, final deliverable.
- Contracts: agents must be idempotent where feasible; tools documented with schemas and preconditions.

Risks
-----
- Tool fallout (partial failures) complicates state; mitigate with retries and clear rollback guidance.
- Retrieval drift (irrelevant results); mitigate with narrow queries and evaluation checks.
- Prompt brittleness; mitigate with examples, templates, and spec-driven behaviors.

Plan & Milestones
-----------------
- M1: Baseline specs + examples for Search and Action agents.
- M2: Minimal orchestrator that composes both agents for a simple workflow.
- M3: Guardrails (confirmations, dry-runs) and basic evaluation harness.

Validation
----------
- Scenario tests for retrieval quality and tool execution correctness.
- Golden transcripts for key behaviors; diff-based checks on updates.
- Deterministic stubs for tools in tests.

Open Questions
--------------
- What are the minimal tool abstractions needed to keep agents portable?
- Which retrieval sources are in-scope initially (files, indexes, code graph)?
- How much state should the orchestrator own vs. delegate?

Links
-----
- Specs:
  - `./agent_action_spec.md`
  - `./agent_search_spec.md`
- Conversations:
  - `./gpt5_conversation_1.md`
  - `./gpt5_conversation_2.md`
- Progress:
  - `../progress/milestone_october.md`
- Bugs:
  - `../bugs/action_agent_bugs.md`
  - `../bugs/search_agent_bugs.md`

Next Steps
----------
- Flesh out `agent_action_spec.md` and `agent_search_spec.md` with contracts and examples.
- Populate `progress/milestone_october.md` with M1 acceptance criteria.
- Add minimal examples that demonstrate orchestrator → search → action flow.
