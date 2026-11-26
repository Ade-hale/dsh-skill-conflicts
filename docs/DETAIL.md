# Skill conflicts

Detects skill conflicts by grouping the installed skills into capability
buckets (search, research, code review, diagram, office, image, browser, git,
memory, skill management, share) and then splitting each crowded bucket into
two verdicts.

## Usage

Ask the agent to run it, for example:

> 检查一下当前有没有功能重叠的 skill

The agent calls the `inspect_skill_conflicts` tool, which returns a two-tier
report. Each line shows the skill name and its source, so you can tell where a
skill comes from before removing it.

## Two verdicts

For every pair inside a capability group, the tool decides in priority order:

1. **Opposing directives (polarity).** If the two skills each carry one side of
   a mutually-exclusive pair (read-only vs write, Chinese vs English), they are
   a real conflict: injecting both yields contradictory instructions.
2. **Complementary objects.** If they target different, disjoint artifacts
   (e.g. docx vs pptx vs xlsx), they are "same capability but no conflict" —
   they duplicate a purpose but produce different outputs and can coexist.
3. **Trigger overlap.** If they share a strong trigger token, or share a domain
   with no object separation, they are a real conflict: the model cannot tell
   which one to invoke.

The report has three sections:

- `## 互相冲突（N 组）` — real conflicts, each with the conflict point
  (opposing constraint or overlapping trigger words) and the consequences
  (ambiguous selection, wasted context, split behaviour, unclear fallback).
- `## 同类型但不冲突（N 组）` — same-capability-but-compatible pairs, each
  listing the duplicated function and why they can coexist (different objects).
- `未分类（N 个）` — skills that matched no keyword.

## Dictionaries

- **Capabilities** — 11 keyword buckets, one per capability domain.
- **Objects** — 12 artifact buckets (doc/docx, slide/pptx, sheet/xlsx, pdf,
  markdown, code, image, video, audio, chart, email, resume), each with English
  and Chinese keys, used to tell complementary pairs apart.
- **Polarity pairs** — mutually-exclusive constraint pairs (output language,
  read/write permission) used to detect rule-level conflicts.
- **Trigger tokens** — English words (stop-word-filtered) plus verbatim Chinese
  terms, used to detect trigger collisions.

## Limitations

The grouping and judgement are keyword/object/polarity-based over the skill
name, description, and whenToUse. It flags *candidates*, not proven conflicts;
review each bucket before deleting anything.

- A skill can appear in several groups; a pair appearing in several groups is
  reported once.
- Same-name shadowing is invisible: the skills service only returns the visible
  winner per layer, so a shadowed skill never appears in the report. Detecting
  shadowing needs filesystem reads, which this release does not implement.
