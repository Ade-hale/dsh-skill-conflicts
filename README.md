# dsh-skill-conflicts

按能力把 DeepSeek Harness 里已安装的 skill 分组，标出功能重叠的项。

## 功能

注册一个模型可调用的工具 `inspect_skill_conflicts`：读取当前 skill 目录，按
能力（联网搜索、深度研究、代码评审、架构/图表、Office、图片、浏览器、Git、
记忆、技能管理、分享）分组，列出每组成员；同组 ≥2 个即标为疑似冗余/冲突。

每条都带 `[来源]`（bundled / user-dsh / project-dsh / custom …），方便在删除前
定位它到底来自哪里。

## 安装

```sh
dsh plugin --profile <profile> add dsh-skill-conflicts
```

或在应用的 **插件 → 添加插件** 里输入 `dsh-skill-conflicts`。

## 用法

对 agent 说：

> 检查一下当前有没有功能重叠的 skill

agent 会调用 `inspect_skill_conflicts` 并返回分组报告。

## 限制

分组基于 skill 名称与描述的关键词匹配，属于启发式判断，标出的只是「疑似冗余」，
不是确证冲突；删除任何 skill 前请先核对它的实际来源。

## License

MIT
