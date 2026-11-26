<p align="center"><img src="./icon.svg" width="72" alt="dsh-skill-conflicts icon: two overlapping circles" /></p>

# dsh-skill-conflicts

**The more skills you install, the more you need to know which ones do the same job.**

Know which of your installed skills overlap — before redundancy turns into confusion.

DeepSeek Harness plugin · Single file · Zero runtime dependencies · MIT

[简体中文](./README.md) · **English**

The more skills you install, the harder overlap is to spot by eye: two search tools, three review tools — after a while, even you can't say which one the agent should reach for. This plugin groups your currently installed skills by capability, flags the crowded groups, and shows where each skill came from, so you can see the whole picture before cleaning anything up.

> Ask the agent: "Check whether any of my installed skills overlap."
>
> The agent calls `inspect_skill_conflicts` and returns a grouped report.

**It only reports *suspected* overlap. It never deletes anything for you.**

> **Current version: v0.1.1** — registers one model-callable tool, `inspect_skill_conflicts` (no parameters, read-only). It only reads the current skill catalog and produces a report; it does not modify or remove any skill.

## Features & Current Status

| Step | What it does | Status |
| --- | --- | --- |
| **Read the catalog** | Reads the name, description, and source of every installed skill via the Harness skills service | Live read; nothing cached or written to disk |
| **Group by capability** | Keyword-matches name + description; a skill can land in several groups at once | 11 capability groups, see below |
| **Flag overlap** | Any group with ≥2 members is flagged as likely redundancy, with members listed one by one | Only groups with ≥2 members appear in the report |
| **Show the source** | Each member carries a `[source]` tag (e.g. bundled / user-dsh / project-dsh / custom) | So you can tell where a skill came from before removing it |
| **List the rest** | Skills matching no keyword are listed separately at the end of the report | Never silently dropped |

### The 11 capability groups

| Capability | Example keywords |
| --- | --- |
| Web search | search, 搜索, 检索, tavily |
| Deep research | research, 研究, 调研, 取证 |
| Code review | review, 审查, 评审 |
| Architecture / diagrams | architect, 架构, diagram, 流程图 |
| Office documents | docx, pptx, xlsx, spreadsheet |
| Image understanding / generation | image, 图片, vision, ocr |
| Browser / web pages | browser, 浏览器, 网页 |
| Git | git, 分支, commit, worktree |
| Memory / context | memory, 记忆, context, recall |
| Skill management | skill, 技能, skillhub |
| Sharing / publishing | share, 分享, publish, 发布 |

### What the report looks like

```text
已安装 skill：24 个。
以下按能力分组，列出每组成员（≥2 个即疑似冗余/冲突）：

■ 联网搜索（3 个）
  - web-search  [bundled]  Search the web for current information…
  - tavily-research  [user-dsh]  Web search and deep research powered by Tavily…
  - news-brief  [custom]  搜索新闻并生成简报…

未分类（5 个）：weather, pomodoro, …

提示：以上为关键词启发式分组，仅供收敛冗余时参考；删除前请先核对每个 skill 的实际来源。
```

> The sample above follows the tool's real output format; the skill names and counts are illustrative, not from an actual run. The report text itself is currently Chinese, as produced by the tool.

## Installation

```sh
dsh plugin --profile <profile> add dsh-skill-conflicts
```

Or, in the app, go to **Plugins → Add plugin** and enter `dsh-skill-conflicts`.

Implementation note: the whole plugin is a single `index.js`. The tool definition is written against the raw ToolDefinition shape with no `@deepseek-ai/dsh-tools` dependency, so a locally linked bundle loads as-is.

## Usage

No command to memorize — just ask the agent in plain language, for example:

> Check whether any of my installed skills overlap

The agent calls `inspect_skill_conflicts` and returns the grouped report. When reading it, start with the source tags: skills in the same group often come from different sources — one bundled, one installed by hand later — which makes the keep/remove decision much easier.

## Boundaries & Limitations

- **Heuristic, not proof.** Grouping is keyword matching over skill names and descriptions. Sharing a group means "the descriptions look similar", not that the functionality truly duplicates; vaguely described skills can be misgrouped or land in the uncategorized list.
- **A skill can appear in several groups.** A skill that both searches and researches will show up under both Web search and Deep research. That is by design, not a counting bug.
- **Read-only.** The plugin never deletes, disables, or modifies any skill. Whether and what to clean up is your call after reading the report — and check the source first.
- **Descriptions are truncated in the report.** Each member's description is shown up to 90 characters; see the original skill for the full text.

## What's Next

Ideas only — not scheduled yet. Priority feedback in issues is welcome:

| Direction | Notes |
| --- | --- |
| **Finer overlap judgement** | On top of keyword groups, compare description similarity within a group and rank the overlap |
| **Configurable grouping rules** | Let users add or remove capability groups and keywords to fit their own skill set |
| **Report export** | Save the grouped report to a file for before/after comparison when cleaning up |

## Contributing

Issues and pull requests about grouping accuracy and false positives/negatives are welcome via [Issues](https://github.com/Ade-hale/dsh-skill-conflicts/issues). When reporting a misgrouped skill, please include its name and description (with any sensitive content removed first) so the keyword rules can be reproduced and improved.

See [docs/DETAIL.md](./docs/DETAIL.md) for more design detail.

## License

Released under the [MIT License](./LICENSE).
