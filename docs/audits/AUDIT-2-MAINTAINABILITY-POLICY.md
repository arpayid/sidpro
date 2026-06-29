# AUDIT-2 — Maintainability Baseline and Triage Policy

**Marker:** `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]`

## Purpose

Maintainability signals are captured as an artifact before they become release gates. This avoids introducing a scanner that rewards cosmetic edits, creates false-positive debt, or blocks justified generated/integration code without ownership.

## Baseline Command

```bash
pnpm audit:maintainability-baseline
```

The command scans source files under API, web, worker, types, validators, and UI packages. It emits JSON and Markdown evidence under `audit-2-artifacts/maintainability/`; the weekly/PR workflow retains the artifact for 30 days.

## Signals Captured

| Signal | Meaning | Not a release verdict because |
| --- | --- | --- |
| Code lines | Comment/blank-line-reduced inventory. | Large files can be legitimate orchestration, DTO/schema, or data-view modules. |
| Heuristic control-flow signals | Lexical `if`/loop/catch/case/logical-operator inventory. | It is not cyclomatic or cognitive complexity. |
| Explicit `any` | `as any`, `: any`, or generic `<any>` occurrences. | Some boundaries require a documented cast pending typed adapter work. |
| TypeScript/ESLint suppressions | `@ts-ignore`, `@ts-expect-error`, and eslint-disable occurrences. | Suppressions may be temporary compatibility controls but require ownership. |
| Console/debugger usage | Debug/operational logging inventory. | Structured worker/runtime logs may be intentional; `debugger` is treated more strictly. |
| TODO/FIXME/HACK/XXX markers | Deferred work clues. | Text may be a product note rather than unresolved technical debt. |
| Exact duplicate files | Full content-hash duplicates only. | It intentionally does not claim semantic/similar duplication. |

## Triage Rules

1. **`debugger` in production source:** must be removed before merge unless a deliberately tested development-only path is proven and documented.
2. **New explicit `any` or suppression:** PR must state the boundary, reason, removal condition, and test/validation coverage. Prefer typed parsers/adapters over broad casts.
3. **Large file or high lexical signal:** reviewer classifies it as accepted orchestration, candidate for extraction, generated/vendor-adjacent code, or follow-up issue. No mechanical split is required.
4. **Exact duplicate group:** compare domain ownership first. Remove only accidental duplication; do not centralize unrelated UI/domain code merely to reduce a metric.
5. **Console calls:** classify as browser debug, structured operational logging, expected CLI output, or removal candidate. Do not blanket-ban production error/health logs.
6. **TODO/FIXME marker:** either attach a named issue, an explicit non-goal, or remove it when stale.

## Escalation

A future required gate needs all of the following in one proposal:

- metric definition and exclusions;
- baseline trend from multiple runs;
- owner and due/review cadence;
- false-positive process and exception record;
- migration plan for existing inventory;
- proof that the gate does not mask risk by encouraging superficial edits.

## Non-Goals

- This policy does not calculate actual cognitive complexity.
- It does not perform license, vulnerability, or secret scanning; those controls belong to their existing workflows.
- It does not claim production runtime quality or frontend accessibility; those require AUDIT-6 and staging evidence.
