<p align="center"><img src="./icon.svg" width="72" alt="dsh-skill-conflicts icon: two overlapping circles" /></p>

# dsh-skill-conflicts

**The more skills you install, the more you need to know which ones do the same job.**

Know which of your installed skills overlap — before redundancy turns into confusion.

DeepSeek Harness plugin · Single file · Zero runtime dependencies · MIT

[简体中文](./README.md) · **English**

The more skills you install, the harder overlap is to spot by eye: two search tools, three review tools — after a while, even you can't say which one the agent should reach for. This plugin groups your currently installed skills by capability, then splits each crowded group into two verdicts: **same-capability-but-compatible** (different artifacts, can coexist) and **real conflicts** (trigger collisions or opposing directives, pick one). It also shows where each skill came from, so you can see the whole picture before cleaning anything up.

> Ask the agent: "Check whether any of my installed skills overlap."
>
> The agent calls `inspect_skill_conflicts` and returns a two-tier report.

**It only reports. It never deletes anything for you.**

> **Current version: v0.2.0** — registers one model-callable tool, `inspect_skill_conflicts` (no parameters, read-only). It only reads the current skill catalog and produces a report; it does not modify or remove any skill. Unlike v0.1.x, which only flagged "suspected redundancy", this release splits overlap into "compatible coexistence" and "real conflict", and explains what each duplicates or breaks.

## Features & Current Status

| Step | What it does | Status |
| --- | --- | --- |
| **Read the catalog** | Reads the name, description, and source of every installed skill via the Harness skills service | Live read; nothing cached or written to disk |
| **Group by capability** | Keyword-matches name + description; a skill can land in several groups at once | 11 capability groups, see below |
| **Same type, no conflict** | Pairs in a group whose artifacts differ (docx vs pptx vs xlsx) are marked compatible, with the duplicated function listed | Decided via an object dictionary |
| **Real conflict** | Pairs whose triggers collide (model can't choose) or whose directives oppose (read-only vs write) are flagged, with the conflict point and consequence listed | Decided via trigger tokens + polarity pairs |
| **Show the source** | Each member carries a `[source]` tag (e.g. bundled / user-dsh / project-dsh / custom) | So you can tell where a skill came from before removing it |
| **List the rest** | Skills matching no keyword are listed separately at the end of the report | Never silently dropped |

### The 11 capability groups

| Capability | Example keywords |
| --- | --- |
| Web search | search, 搜索, 检索, tavily |
| Deep research | research, 研究, 调研, 取证 |
| Code review | code review, reviewing, 代码评审, 代码审查 |
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
已安装 skill：12 个（启发式判定，候选而非确证）。

## 互相冲突（3 组）
以下 skill 会互相干扰，建议二选一或明确触发边界：

1) web-search ⇄ tavily  [联网搜索]
   冲突点：触发语重叠，模型无法区分该调用哪一个。
   重叠词：search
   会引起的问题：
     · 选型不确定：同一句请求可能命中任意一个，结果不一致、难以复现；
     · 上下文浪费：多份同名能力同时进入提示，挤占 token；
     · 行为分裂：不同实现/不同数据源给出不同答案；
     · 失败回退不明：一个出错时模型可能换用另一个，掩盖真实问题。
   - web-search  [bundled]  Search the web for current information…
   - tavily  [user-dsh]  AI-optimized web search using Tavily Search API…

## 同类型但不冲突（3 组）
以下 skill 能力重复，但产物/对象不同，可共存：

1) office-docx ⇄ office-pptx  [Office 文档]
   功能重复：都在「Office 文档」这一能力域内。
   可共存原因：产物不同（文档(docx/word) vs 演示文稿(pptx)），入口互不抢占。
   - office-docx  [bundled]  Create, read, edit, and validate Word documents (.docx).
   - office-pptx  [bundled]  Create, read, edit, and validate PowerPoint presentations…

未分类（1 个）：weather

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

The agent calls `inspect_skill_conflicts` and returns the report. Start with the "real conflict" section: that is what actually needs attention — colliding triggers make the model's choice drift, and opposing directives produce self-contradictory output. "Same type, no conflict" usually needs nothing: different artifacts, distinct jobs. Then look at the source tags: skills in the same group often come from different sources — one bundled, one installed by hand later — which makes the keep/remove decision much easier.

## Decision Logic

Within each capability group, every pair is compared with these priorities:

1. **Opposing directives (polarity)** — each side carries an opposite constraint of the same pair (e.g. read-only vs write, Chinese vs English) → conflict.
2. **Complementary objects** — the two target different, disjoint artifacts (docx vs pptx) → same type, no conflict.
3. **Trigger overlap** — the two share a strong trigger token, or share a domain with no object separation → conflict.

## Boundaries & Limitations

- **Heuristic, not proof.** Grouping and judgement are keyword/object/polarity matching over each skill's name, description, and whenToUse. A "conflict" flag means "these look like they would interfere", not that they truly do; vaguely described skills can be misgrouped or land in the uncategorized list.
- **A skill can appear in several groups.** A skill that both searches and researches will show up under both Web search and Deep research. That is by design, not a counting bug. A pair appearing in several groups is reported only once.
- **Same-name shadowing is invisible.** The skills service only returns the visible winner per layer, so a skill shadowed by a same-name one never appears in the report; detecting shadowing needs filesystem reads, which this release does not implement.
- **Read-only.** The plugin never deletes, disables, or modifies any skill. Whether and what to clean up is your call after reading the report — and check the source first.
- **Descriptions are truncated in the report.** Each member's description is shown up to 90 characters; see the original skill for the full text.

## What's Next

Ideas only — not scheduled yet. Priority feedback in issues is welcome:

| Direction | Notes |
| --- | --- |
| **Same-name shadowing detection** | Read the filesystem to surface skills hidden by a same-name one |
| **Configurable grouping rules** | Let users add or remove capability groups, objects, and keywords to fit their own skill set |
| **Report export** | Save the report to a file for before/after comparison when cleaning up |

## Contributing

Issues and pull requests about grouping accuracy and false positives/negatives are welcome via [Issues](https://github.com/Ade-hale/dsh-skill-conflicts/issues). When reporting a misgrouped skill, please include its name and description (with any sensitive content removed first) so the keyword rules can be reproduced and improved.

See [docs/DETAIL.md](./docs/DETAIL.md) for more design detail.

See [CHANGELOG.md](./CHANGELOG.md) for the change log.

## License

Released under the [MIT License](./LICENSE).
