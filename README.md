<p align="center"><img src="./icon.svg" width="72" alt="dsh-skill-conflicts 图标：两个交叠的圆" /></p>

# dsh-skill-conflicts

**装的 skill 越多，越要知道谁和谁在做同一件事。**

Know which of your installed skills overlap — before redundancy turns into confusion.

DeepSeek Harness 插件 · 单文件 · 零运行时依赖 · MIT

**简体中文** · [English](./README.en.md)

skill 装得越多，功能重叠就越难靠肉眼发现：两个搜索工具、三个评审工具，agent 到底该用哪个，时间久了自己也说不清。这个插件把当前已安装的 skill 按能力分组，把同组里扎堆的项标出来，并注明每个 skill 的来源，让你在动手清理之前先看清全貌。

> 对 agent 说：「检查一下当前有没有功能重叠的 skill」
>
> agent 会调用 `inspect_skill_conflicts`，返回一份分组报告。

**它只负责报告「疑似重叠」，不替你删除任何东西。**

> **当前版本：v0.1.1** — 注册一个模型可调用的工具 `inspect_skill_conflicts`（无参数、只读）。它只读取当前 skill 目录并生成报告，不修改、不删除任何 skill。

## 功能与当前状态

| 环节 | 做什么 | 当前状态 |
| --- | --- | --- |
| **读取目录** | 通过 Harness 的 skills 服务读取当前已安装 skill 的名称、描述与来源 | 实时读取，不缓存、不落盘 |
| **能力分组** | 对名称 + 描述做关键词匹配，一个 skill 可同时落入多个能力组 | 11 个能力组，见下表 |
| **标出重叠** | 同组 ≥2 个即标为疑似冗余/冲突，逐个列出成员 | 只标记 ≥2 个的组；单成员组不出现在报告里 |
| **来源标记** | 每条成员带 `[来源]`（如 bundled / user-dsh / project-dsh / custom） | 方便删除前定位 skill 到底来自哪里 |
| **未分类清单** | 没命中任何关键词的 skill 单独列在报告末尾 | 不静默丢弃，避免漏看 |

### 能力分组：11 类

| 能力 | 关键词示例 |
| --- | --- |
| 联网搜索 | search、搜索、检索、tavily |
| 深度研究 | research、研究、调研、取证 |
| 代码评审 | review、审查、评审 |
| 架构/图表 | architect、架构、diagram、流程图 |
| Office 文档 | docx、pptx、xlsx、spreadsheet |
| 图片理解/生成 | image、图片、vision、ocr |
| 浏览器/网页 | browser、浏览器、网页 |
| Git | git、分支、commit、worktree |
| 记忆/上下文 | memory、记忆、context、recall |
| 技能管理 | skill、技能、skillhub |
| 分享/发布 | share、分享、publish、发布 |

### 报告长什么样

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

> 上面是按真实输出格式编写的示例，成员名称与数量为示意，不是某次真实运行的结果。

## 安装

```sh
dsh plugin --profile <profile> add dsh-skill-conflicts
```

或在应用的 **插件 → 添加插件** 里输入 `dsh-skill-conflicts`。

实现说明：整个插件只有一个 `index.js`，工具定义直接按原始 ToolDefinition 形状编写，不依赖 `@deepseek-ai/dsh-tools`，本地链接的 bundle 也能直接加载。

## 用法

装好后不需要记命令，对 agent 说一句自然语言即可，例如：

> 检查一下当前有没有功能重叠的 skill

agent 会调用 `inspect_skill_conflicts` 并返回分组报告。看报告时建议先看来源标记：同组里来自不同来源的 skill，往往是一个是自带、一个是后来手动装的，保留哪个更容易判断。

## 边界与限制

- **启发式，不是确证。** 分组基于 skill 名称与描述的关键词匹配。同组只说明「描述看起来像」，不证明功能真的重复；描述写得含糊的 skill 也可能被分错组或落入未分类。
- **一个 skill 可以在多个组里出现。** 比如同时做搜索和研究的 skill 会同时出现在「联网搜索」和「深度研究」里，这是预期行为，不是重复计数错误。
- **只读。** 插件不会自动删除、禁用或修改任何 skill；要不要清理、清理哪个，由你看完报告后决定，删除前请先核对来源。
- **报告里的描述会截断。** 每个成员的描述只显示前 90 个字符，完整描述请回原 skill 查看。

## 接下来做什么

以下为设想，尚未排期，欢迎在 issue 里讨论优先级：

| 方向 | 说明 |
| --- | --- |
| **更细的重叠判断** | 在关键词分组之上，比较同组 skill 描述的相似度，给重叠程度排序 |
| **分组规则可配置** | 允许用户增删能力组与关键词，适配自己的 skill 集合 |
| **报告导出** | 把分组报告存成文件，方便清理前后对照 |

## 参与开发

欢迎围绕分组准确率、误报/漏报案例提交 [Issue](https://github.com/Ade-hale/dsh-skill-conflicts/issues) 或 Pull Request。反馈误报时，请附上被误分的 skill 名称与描述（注意先移除其中的敏感信息），这样关键词规则才好复现和改进。

更详细的设计说明见 [docs/DETAIL.md](./docs/DETAIL.md)。

## License

本项目采用 [MIT License](./LICENSE)。
