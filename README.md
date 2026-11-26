<p align="center"><img src="./icon.svg" width="72" alt="dsh-skill-conflicts 图标：两个交叠的圆" /></p>

# dsh-skill-conflicts

**装的 skill 越多，越要知道谁和谁在做同一件事。**

Know which of your installed skills overlap — before redundancy turns into confusion.

DeepSeek Harness 插件 · 单文件 · 零运行时依赖 · MIT

**简体中文** · [English](./README.en.md)

skill 装得越多，功能重叠就越难靠肉眼发现：两个搜索工具、三个评审工具，agent 到底该用哪个，时间久了自己也说不清。这个插件把当前已安装的 skill 按能力分组，然后把同组里扎堆的项**分成两类**：一类是「同类型但不冲突」（产物不同、可以共存），一类是「互相冲突」（触发语撞车或规则对立、必须二选一），并注明每个 skill 的来源，让你在动手清理之前先看清全貌。

> 对 agent 说：「检查一下当前有没有功能重叠的 skill」
>
> agent 会调用 `inspect_skill_conflicts`，返回一份分两档的报告。

**它只负责报告，不替你删除任何东西。**

> **当前版本：v0.2.0** — 注册一个模型可调用的工具 `inspect_skill_conflicts`（无参数、只读）。它只读取当前 skill 目录并生成报告，不修改、不删除任何 skill。相比 v0.1.x 只标「疑似冗余」，本版把重叠拆成「互补共存」和「真实冲突」两档，并分别说明重复点与冲突后果。

## 功能与当前状态

| 环节 | 做什么 | 当前状态 |
| --- | --- | --- |
| **读取目录** | 通过 Harness 的 skills 服务读取当前已安装 skill 的名称、描述与来源 | 实时读取，不缓存、不落盘 |
| **能力分组** | 对名称 + 描述做关键词匹配，一个 skill 可同时落入多个能力组 | 11 个能力组，见下表 |
| **同类型但不冲突** | 同组里产物/对象不同的组合（如 docx vs pptx vs xlsx）判为可共存，列出功能重复点 | 依据对象词典判定 |
| **互相冲突** | 触发语重叠（模型无法区分调用谁）或规则对立（如只读 vs 写入）的组合，列出冲突点与后果 | 依据触发词 + 极性对判定 |
| **来源标记** | 每条成员带 `[来源]`（如 bundled / user-dsh / project-dsh / custom） | 方便删除前定位 skill 到底来自哪里 |
| **未分类清单** | 没命中任何关键词的 skill 单独列在报告末尾 | 不静默丢弃，避免漏看 |

### 能力分组：11 类

| 能力 | 关键词示例 |
| --- | --- |
| 联网搜索 | search、搜索、检索、tavily |
| 深度研究 | research、研究、调研、取证 |
| 代码评审 | code review、reviewing、代码评审、代码审查 |
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

agent 会调用 `inspect_skill_conflicts` 并返回报告。看报告时建议先看「互相冲突」：那是真正该处理的——触发语撞车会让模型选型漂移，规则对立会让输出自相矛盾；「同类型但不冲突」则通常不用动，产物不同、各司其职。再看来源标记：同组里来自不同来源的 skill，往往是一个是自带、一个是后来手动装的，保留哪个更容易判断。

## 判定逻辑

对每个能力组里的成员两两比较，按优先级判定：

1. **规则对立（polarity）** — 两者各带一对相反约束（如「只读」vs「写入」「中文」vs「英文」），判为冲突。
2. **对象互补（objects）** — 两者对象不同且无交集（docx vs pptx），判为「同类型但不冲突」。
3. **触发重叠（trigger）** — 两者共享强触发词，或同域且无对象区分，判为冲突。

## 边界与限制

- **启发式，不是确证。** 分组与判定基于 skill 名称、描述、whenToUse 的关键词/对象/极性匹配。判为冲突只说明「看起来会互相干扰」，不证明真的冲突；描述写得含糊的 skill 也可能被分错组或落入未分类。
- **一个 skill 可以在多个组里出现。** 比如同时做搜索和研究的 skill 会同时出现在「联网搜索」和「深度研究」里，这是预期行为，不是重复计数错误。同一对 skill 跨组出现时只报告一次。
- **同名遮蔽检测不到。** skills 服务只返回每层可见的 winner，被同名遮蔽的 skill 不会出现在报告里；这类遮蔽需要读文件系统才能发现，本版尚未实现。
- **只读。** 插件不会自动删除、禁用或修改任何 skill；要不要清理、清理哪个，由你看完报告后决定，删除前请先核对来源。
- **报告里的描述会截断。** 每个成员的描述只显示前 90 个字符，完整描述请回原 skill 查看。

## 接下来做什么

以下为设想，尚未排期，欢迎在 issue 里讨论优先级：

| 方向 | 说明 |
| --- | --- |
| **同名遮蔽检测** | 读文件系统，找出被同名 skill 遮蔽而不可见的项 |
| **分组规则可配置** | 允许用户增删能力组、对象与关键词，适配自己的 skill 集合 |
| **报告导出** | 把报告存成文件，方便清理前后对照 |

## 参与开发

欢迎围绕分组准确率、误报/漏报案例提交 [Issue](https://github.com/Ade-hale/dsh-skill-conflicts/issues) 或 Pull Request。反馈误报时，请附上被误分的 skill 名称与描述（注意先移除其中的敏感信息），这样关键词规则才好复现和改进。

更详细的设计说明见 [docs/DETAIL.md](./docs/DETAIL.md)。

变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## License

本项目采用 [MIT License](./LICENSE)。
