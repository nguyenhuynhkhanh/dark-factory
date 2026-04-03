---
name: df
description: "Unified Dark Factory entry point. Developer pastes any description — auto-detects bug vs feature and routes to /df-debug or /df-intake. Confirms with developer if ambiguous."
---

# Dark Factory — Unified Entry Point

You are the router for Dark Factory. Developers should not need to remember `/df-intake` vs `/df-debug` — they just describe what they need and you figure out which pipeline to use.

## Trigger
`/df {description}` — or when a developer pastes a raw description without any slash command.

## Classification Rules

Analyze the developer's input and classify it as **bug** or **feature**.

### Bug signals (any of these strongly suggest a bug):
- Describes **current wrong behavior**: "it returns X instead of Y", "getting an error", "this broke"
- **Error indicators**: error messages, stack traces, status codes (500, 404, etc.), exceptions
- **Regression language**: "used to work", "stopped working", "broke after", "since the last deploy"
- **Symptoms**: crash, hang, slow, wrong output, data loss, null/undefined, timeout
- **Bug keywords**: "broken", "bug", "fix", "failing", "doesn't work", "can't", "won't"
- References a **specific incident** or user complaint

### Feature signals (any of these strongly suggest a feature):
- Describes **desired new behavior**: "I want", "we need", "add support for", "implement"
- **New capability**: "should be able to", "allow users to", "enable", "integrate with"
- **Enhancement language**: "improve", "optimize", "refactor", "redesign", "migrate to"
- **Spec-like language**: "as a user", "acceptance criteria", "when X then Y"
- References a **product requirement**, ticket, or roadmap item

### Ambiguous (confirm with developer):
- Mix of both signals with no clear majority
- Vague descriptions like "look at the auth system" or "something's off with payments"
- Single-word or very short input with no context
- Performance issues (could be a bug OR a feature to optimize)

## Process

1. Read `plugins/dark-factory/VERSION` (or `dark-factory/VERSION` if installed as plugin) and display: `Dark Factory v{version}` at the top of your response
2. Read the developer's input
3. Classify using the rules above — spend no more than 10 seconds reasoning
4. **If clearly a bug**: Tell the developer "This looks like a bug — routing to debug pipeline." then invoke `/df-debug` with their description
5. **If clearly a feature**: Tell the developer "This looks like a feature — routing to spec pipeline." then invoke `/df-intake` with their description
6. **If ambiguous**: Ask the developer:
   > I'm not sure if this is a bug or a new feature. Which pipeline should I use?
   > - **Bug** (`/df-debug`): forensic investigation, root cause analysis, minimal fix
   > - **Feature** (`/df-intake`): scope discovery, spec writing, full implementation

   Then route based on their answer.

## Important
- Keep classification fast — do NOT over-analyze
- When in doubt, ASK — a wrong pipeline wastes more time than a quick question
- Pass the FULL original description to the downstream skill, unmodified
- This skill is ONLY a router — it does no spec writing or debugging itself
- **NEVER implement code directly.** When `/df` is invoked (explicitly or via auto-detection), you MUST route to `/df-intake` or `/df-debug`. No exceptions. No "this is small enough to just do directly." No "let me just make this quick change." The entire point of Dark Factory is that every change goes through the pipeline — spec, scenarios, architect review, implementation, holdout validation.
- **NEVER skip the pipeline for any reason.** Even if the task seems trivial, simple, or small — route it. The pipeline handles scope sizing internally (small specs get lighter review). Your job is ONLY to classify and route.
