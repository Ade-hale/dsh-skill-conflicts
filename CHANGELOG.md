# Changelog

本项目的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-11-26

### 新增

- **两档冲突判定**，取代 v0.1.x 单一的「疑似冗余」分组：
  - **同类型但不冲突**：同能力但产物不同（如 office-docx / office-pptx / office-xlsx）判为可共存，列出功能重复点与可共存原因。
  - **互相冲突**：触发语重叠（模型无法区分调用哪一个）或规则对立（只读 vs 写入、中文 vs 英文）判为真实冲突，列出冲突点与后果。
- `OBJECTS` 词典：12 类产物（doc / slide / sheet / pdf / markdown / code / image / video / audio / chart / email / resume），各带中英文 key，用于区分「同能力不同产物」。
- `POLARITY_PAIRS` 词典：输出语言、读写权限两对互斥约束，用于检测规则级冲突。
- 中英停用词与中文触发词（`ZH_TERMS`）词典，用于触发重叠检测。
- 报告新增「冲突点 / 重叠词 / 会引起的问题」「功能重复点 / 可共存原因」等字段。

### 变更

- 报告结构由「按能力分组列出成员」改为「互相冲突 / 同类型但不冲突 / 未分类」三节。
- 工具描述更新为两档判定的语义说明。

### 修复

- 「代码评审」关键词过宽：裸 `review` 会把含 "citation review" 的研究类 skill 误分进代码评审组。现收紧为 `code review` / `reviewing` / `代码评审` / `代码审查` 等。
- tokenizer 正则保留句点导致重叠词出现 `information.` 之类脏词，已修正并补充停用词。

## [0.1.1] - 2026-11-26

### 新增

- 首个版本：注册模型可调用的工具 `inspect_skill_conflicts`（无参数、只读）。
- 11 类能力分组（联网搜索 / 深度研究 / 代码评审 / 架构图表 / Office / 图片 / 浏览器 / Git / 记忆 / 技能管理 / 分享）。
- 同组 ≥2 个即标为疑似冗余，附带 `[来源]` 标记；未命中关键词的 skill 列在末尾。
