/**
 * dsh-skill-conflicts — Host half.
 *
 * Registers one model-facing tool, `inspect_skill_conflicts`, that reads the
 * live skill catalog and reports skills whose purpose overlaps. The check is
 * heuristic, so the report flags candidates, not certainties — but it now
 * separates two cases the v0.1.x report conflated:
 *
 *  1. 同类型但不冲突 (same capability, complementary objects) — skills that
 *     share a purpose but target different artifacts, so they can coexist.
 *  2. 互相冲突 (real conflict) — skills whose triggers collide (the model
 *     cannot tell which one to invoke) or whose directives are mutually
 *     exclusive.
 *
 * The tool definition is written against the raw ToolDefinition shape (no
 * @deepseek-ai/dsh-tools import) so a locally linked bundle loads without
 * resolving Harness-internal packages from the workspace.
 */
export const inject = ["skills", "tools"];

const TEXT_OUTPUT = {
  schema: { type: "string" },
  render: (_args, value) => [{ type: "text", text: value }],
};

/** Capability buckets. A skill lands in every bucket whose keywords it matches. */
const CATEGORIES = [
  { id: "web-search", label: "联网搜索", keywords: ["search", "搜索", "检索", "tavily", "web-search"] },
  { id: "research", label: "深度研究", keywords: ["research", "研究", "investigat", "deep", "调研", "取证"] },
  { id: "code-review", label: "代码评审", keywords: ["code-review", "code review", "reviewing", "代码评审", "代码审查", "pr review", "merge request review"] },
  { id: "diagram", label: "架构/图表", keywords: ["architect", "架构", "diagram", "图表", "uml", "4+1", "流程图"] },
  { id: "office", label: "Office 文档", keywords: ["office", "docx", "pptx", "xlsx", "excel", "word", "powerpoint", "spreadsheet"] },
  { id: "image", label: "图片理解/生成", keywords: ["image", "图片", "vision", "视觉", "ocr", "draw", "生成图"] },
  { id: "browser", label: "浏览器/网页", keywords: ["browser", "浏览器", "web page", "网页"] },
  { id: "git", label: "Git", keywords: ["git", "分支", "commit", "提交", "worktree"] },
  { id: "memory", label: "记忆/上下文", keywords: ["memory", "记忆", "context", "上下文", "mnemon", "recall"] },
  { id: "skill-management", label: "技能管理", keywords: ["skill", "技能", "skillhub", "skill manager"] },
  { id: "share", label: "分享/发布", keywords: ["share", "分享", "publish", "发布"] },
];

/**
 * Object / artifact buckets. Two skills in the same capability group are
 * "同类型但不冲突" only when they target *different* objects — e.g. docx vs
 * pptx vs xlsx. If their objects overlap or both are unspecified, the model
 * cannot tell them apart and we flag a trigger conflict instead.
 */
const OBJECTS = [
  { id: "doc", label: "文档(docx/word)", keys: ["docx", "word", "document", "文档"] },
  { id: "slide", label: "演示文稿(pptx)", keys: ["pptx", "powerpoint", "slide", "幻灯片"] },
  { id: "sheet", label: "电子表格(xlsx)", keys: ["xlsx", "excel", "spreadsheet", "表格"] },
  { id: "pdf", label: "PDF", keys: ["pdf"] },
  { id: "markdown", label: "Markdown", keys: ["markdown", ".md"] },
  { id: "code", label: "代码", keys: ["code", "代码", "source", "typescript", "python"] },
  { id: "image", label: "图片", keys: ["image", "图片", "photo", "海报", "截图"] },
  { id: "video", label: "视频", keys: ["video", "视频"] },
  { id: "audio", label: "音频", keys: ["audio", "音频"] },
  { id: "chart", label: "图表", keys: ["chart", "diagram", "flowchart", "图表", "流程图"] },
  { id: "email", label: "邮件", keys: ["email", "mail", "邮件"] },
  { id: "resume", label: "简历", keys: ["resume", "简历"] },
];

/** English stop-words dropped before trigger comparison. */
const STOP_EN = new Set(
  ("a an the and or of to in on for with by at from as is are was were be been being " +
    "this that these those it its it's we you your our their he she they i my me him her " +
    "will can may should would could must not no do does did has have had use using used " +
    "when where what which who how why then than so if else but also just only about into " +
    "over under again further during before after between both each other some any such very " +
    "much more most less few because while against through per up down out off own same too " +
    "new now your your's them then now support provide help with without like make made " +
    "tool tools skill skills agent model dsh deepseek harness task work file files data " +
    "using based based-on web the current information content format output input source " +
    "latest multi network retrieve retrieve answers answer results summary").split(/\s+/),
);

/** Chinese stop/boilerplate words dropped before trigger comparison. */
const STOP_ZH = new Set(
  "的 了 和 与 或 及 是 在 有 为 对 于 把 被 让 将 能 会 可 要 需 用 做 进行 提供 支持 帮助 使用 用于 " +
    "一个 一些 这个 那个 这些 那些 什么 怎么 如何 为什么 以及 并且 但是 因为 所以 如果 关于 通过 自动 内容 工具 " +
    "技能 生成 搜索 检索 功能 场景 任务 文档 文件 数据 信息 网页 页面 相关 支持 能力 系统 环境 模型".split(/\s+/),
);

/** Chinese "strong" trigger terms looked up verbatim in the text. */
const ZH_TERMS = [
  "深度研究", "调研", "取证", "事实核查", "联网", "代码评审", "审查", "架构设计", "设计模式",
  "流程图", "时序图", "类图", "幻灯片", "电子表格", "简历", "海报", "截图", "文章", "简报",
  "安装技能", "卸载技能", "技能广场", "发布", "分享", "记忆", "召回", "上下文", "归档", "技能管理",
  "招聘", "岗位", "舆情", "学术", "财报", "选型", "趋势分析",
];

/**
 * Mutually-exclusive directive pairs. When two skills in the same capability
 * group each carry one side of a pair, injecting both into the same session
 * yields contradictory instructions — a genuine conflict regardless of trigger
 * overlap.
 */
const POLARITY_PAIRS = [
  { id: "lang", label: "输出语言", a: ["中文", "chinese", "简体中文"], b: ["英文", "english", "英语"] },
  { id: "write", label: "读写权限", a: ["只读", "read-only", "readonly", "不修改", "不写入"], b: ["写入", "修改", "write", "edit", "变更"] },
];

function norm(text) {
  return (text ?? "").toLowerCase();
}

/** Extract trigger tokens (English words + verbatim Chinese terms). */
function tokensOf(name, description, whenToUse) {
  const hay = `${name} ${description ?? ""} ${whenToUse ?? ""}`;
  const tokens = new Set();

  for (const w of hay.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!w) continue;
    if (STOP_EN.has(w)) continue;
    if (w.length < 3 && !/\./.test(w)) continue;
    tokens.add(w);
  }

  for (const t of ZH_TERMS) {
    if (hay.includes(t)) tokens.add(t);
  }

  return tokens;
}

function objectsOf(name, description, whenToUse) {
  const hay = `${name} ${description ?? ""} ${whenToUse ?? ""}`.toLowerCase();
  const ids = new Set();
  for (const o of OBJECTS) {
    if (o.keys.some((k) => hay.includes(k.toLowerCase()))) ids.add(o.id);
  }
  return ids;
}

function polarityOf(description, whenToUse) {
  const hay = norm(`${description ?? ""} ${whenToUse ?? ""}`);
  const hits = [];
  for (const p of POLARITY_PAIRS) {
    const sideA = p.a.some((k) => hay.includes(k));
    const sideB = p.b.some((k) => hay.includes(k));
    if (sideA && !sideB) hits.push({ pair: p.id, side: "a" });
    else if (sideB && !sideA) hits.push({ pair: p.id, side: "b" });
  }
  return hits;
}

function bucketOf(name, description) {
  const hay = `${name} ${description ?? ""}`.toLowerCase();
  const ids = [];
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => hay.includes(k.toLowerCase()))) ids.push(c.id);
  }
  return ids;
}

/** Two skills whose object sets are disjoint (and both non-empty) are separable. */
function objectsDisjoint(a, b) {
  if (a.size === 0 || b.size === 0) return false;
  for (const x of a) if (b.has(x)) return false;
  return true;
}

function objectLabels(ids) {
  return [...ids].map((id) => OBJECTS.find((o) => o.id === id)?.label ?? id);
}

/** Two skills whose polarity hits sit on opposite sides of the same pair conflict. */
function polarityConflict(a, b) {
  for (const pa of a.polarity) {
    for (const pb of b.polarity) {
      if (pa.pair === pb.pair && pa.side !== pb.side) return pa.pair;
    }
  }
  return null;
}

function clip(text, n = 90) {
  return (text ?? "").replace(/\s+/g, " ").slice(0, n);
}

export function apply(ctx) {
  ctx.tools.register({
    name: "inspect_skill_conflicts",
    description:
      "Report skill overlap in DeepSeek Harness. Groups installed skills by capability and splits the crowded groups into two verdicts: (1) same-capability-but-compatible — skills that share a purpose but target different artifacts (e.g. docx vs pptx), listing what they duplicate; (2) real conflicts — skills whose triggers collide so the model cannot choose, or whose directives are mutually exclusive, listing where they conflict and what breaks as a result. Keyword/heuristic based, so treat flags as candidates to review, not proven facts.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    output: TEXT_OUTPUT,
    execute: async () => {
      const skills = await ctx.skills.list({});

      const byCategory = new Map();
      const uncategorized = [];
      const enriched = skills.map((s) => {
        const desc = s.description ?? "";
        const wtu = s.whenToUse ?? "";
        return {
          ...s,
          buckets: bucketOf(s.name, desc),
          objects: objectsOf(s.name, desc, wtu),
          polarity: polarityOf(desc, wtu),
          tokens: tokensOf(s.name, desc, wtu),
        };
      });

      for (const s of enriched) {
        if (s.buckets.length === 0) {
          uncategorized.push(s);
          continue;
        }
        for (const id of s.buckets) {
          if (!byCategory.has(id)) byCategory.set(id, []);
          byCategory.get(id).push(s);
        }
      }

      const conflicts = [];
      const compatible = [];

      for (const c of CATEGORIES) {
        const members = byCategory.get(c.id) ?? [];
        if (members.length < 2) continue;

        // Compare every pair once.
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const a = members[i];
            const b = members[j];
            const sharedTokens = [...a.tokens].filter((t) => b.tokens.has(t));

            const polarPair = polarityConflict(a, b);
            if (polarPair) {
              conflicts.push({ category: c.label, a, b, kind: "polarity", pair: polarPair });
              continue;
            }

            if (objectsDisjoint(a.objects, b.objects)) {
              compatible.push({ category: c.label, a, b, kind: "objects" });
              continue;
            }

            if (sharedTokens.length > 0) {
              conflicts.push({ category: c.label, a, b, kind: "trigger", sharedTokens });
              continue;
            }

            // Same group, no object separation, no shared strong token: still
            // fuzzy. Treat as trigger conflict with an empty overlap note.
            conflicts.push({ category: c.label, a, b, kind: "trigger", sharedTokens });
          }
        }
      }

      // De-duplicate conflicts: a pair may appear under several categories.
      const seen = new Set();
      const uniqConflicts = conflicts.filter((x) => {
        const key = [x.a.name, x.b.name].sort().join("::");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const uniqCompatible = compatible.filter((x) => {
        const key = [x.a.name, x.b.name].sort().join("::");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const lines = [];
      lines.push(`已安装 skill：${skills.length} 个（启发式判定，候选而非确证）。`);

      // ---- Conflicts ----
      if (uniqConflicts.length > 0) {
        lines.push("");
        lines.push(`## 互相冲突（${uniqConflicts.length} 组）`);
        lines.push("以下 skill 会互相干扰，建议二选一或明确触发边界：");

        uniqConflicts.forEach((x, idx) => {
          lines.push("");
          lines.push(`${idx + 1}) ${x.a.name} ⇄ ${x.b.name}  [${x.category}]`);
          if (x.kind === "polarity") {
            const p = POLARITY_PAIRS.find((q) => q.id === x.pair);
            lines.push(`   冲突点：两者的「${p.label}」约束相反（一个要求 ${p.a[0]}，另一个要求 ${p.b[0]}）。`);
            lines.push(`   会引起的问题：两套相反规则同时注入系统提示 → 输出自相矛盾、行为漂移，且随调用顺序不同结果不稳定。`);
          } else {
            lines.push(`   冲突点：触发语重叠，模型无法区分该调用哪一个。`);
            if (x.sharedTokens.length > 0) {
              lines.push(`   重叠词：${x.sharedTokens.slice(0, 12).join("、")}`);
            } else {
              lines.push(`   重叠词：（无强词命中，但同域且无对象区分，视为疑似）`);
            }
            lines.push(`   会引起的问题：`);
            lines.push(`     · 选型不确定：同一句请求可能命中任意一个，结果不一致、难以复现；`);
            lines.push(`     · 上下文浪费：多份同名能力同时进入提示，挤占 token；`);
            lines.push(`     · 行为分裂：不同实现/不同数据源给出不同答案；`);
            lines.push(`     · 失败回退不明：一个出错时模型可能换用另一个，掩盖真实问题。`);
          }
          lines.push(`   - ${x.a.name}  [${x.a.source}]  ${clip(x.a.description)}`);
          lines.push(`   - ${x.b.name}  [${x.b.source}]  ${clip(x.b.description)}`);
        });
      } else {
        lines.push("");
        lines.push("## 互相冲突（0 组）");
        lines.push("未发现触发竞争或规则对立的 skill。");
      }

      // ---- Compatible (same type, no conflict) ----
      if (uniqCompatible.length > 0) {
        lines.push("");
        lines.push(`## 同类型但不冲突（${uniqCompatible.length} 组）`);
        lines.push("以下 skill 能力重复，但产物/对象不同，可共存：");

        uniqCompatible.forEach((x, idx) => {
          lines.push("");
          lines.push(`${idx + 1}) ${x.a.name} ⇄ ${x.b.name}  [${x.category}]`);
          lines.push(`   功能重复：都在「${x.category}」这一能力域内。`);
          lines.push(`   可共存原因：产物不同（${objectLabels(x.a.objects).join("/")} vs ${objectLabels(x.b.objects).join("/")}），入口互不抢占。`);
          lines.push(`   - ${x.a.name}  [${x.a.source}]  ${clip(x.a.description)}`);
          lines.push(`   - ${x.b.name}  [${x.b.source}]  ${clip(x.b.description)}`);
        });
      } else {
        lines.push("");
        lines.push("## 同类型但不冲突（0 组）");
        lines.push("未发现同域但产物互补的组合。");
      }

      lines.push("");
      lines.push(`未分类（${uncategorized.length} 个）：${uncategorized.map((s) => s.name).join(", ") || "无"}`);
      lines.push("");
      lines.push("提示：以上为关键词启发式分组，仅供收敛冗余时参考；删除前请先核对每个 skill 的实际来源。");
      return lines.join("\n");
    },
  });
}
