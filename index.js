/**
 * dsh-skill-conflicts — Host half.
 *
 * Registers one model-facing tool, `inspect_skill_conflicts`, that reads the
 * live skill catalog and reports skills whose purpose overlaps. The check is
 * heuristic (keyword categories over name + description), so the report flags
 * candidates, not certainties.
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
  { id: "code-review", label: "代码评审", keywords: ["review", "审查", "评审", "code-review", "reviewing"] },
  { id: "diagram", label: "架构/图表", keywords: ["architect", "架构", "diagram", "图表", "uml", "4+1", "流程图"] },
  { id: "office", label: "Office 文档", keywords: ["office", "docx", "pptx", "xlsx", "excel", "word", "powerpoint", "spreadsheet"] },
  { id: "image", label: "图片理解/生成", keywords: ["image", "图片", "vision", "视觉", "ocr", "draw", "生成图"] },
  { id: "browser", label: "浏览器/网页", keywords: ["browser", "浏览器", "web page", "网页"] },
  { id: "git", label: "Git", keywords: ["git", "分支", "commit", "提交", "worktree"] },
  { id: "memory", label: "记忆/上下文", keywords: ["memory", "记忆", "context", "上下文", "mnemon", "recall"] },
  { id: "skill-management", label: "技能管理", keywords: ["skill", "技能", "skillhub", "skill manager"] },
  { id: "share", label: "分享/发布", keywords: ["share", "分享", "publish", "发布"] },
];

function bucketOf(name, description) {
  const hay = `${name} ${description}`.toLowerCase();
  const ids = [];
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => hay.includes(k))) ids.push(c.id);
  }
  return ids;
}

export function apply(ctx) {
  ctx.tools.register({
    name: "inspect_skill_conflicts",
    description:
      "Report skills whose purpose overlaps. Groups the installed skills by capability (search, research, code review, diagram, office, image, browser, git, memory, skill management, share) and flags categories with more than one skill as likely redundancy. The grouping is keyword-based, so treat flags as candidates to review rather than proven conflicts.",
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
      for (const s of skills) {
        const ids = bucketOf(s.name, s.description ?? "");
        if (ids.length === 0) {
          uncategorized.push(s);
          continue;
        }
        for (const id of ids) {
          if (!byCategory.has(id)) byCategory.set(id, []);
          byCategory.get(id).push(s);
        }
      }

      const lines = [];
      lines.push(`已安装 skill：${skills.length} 个。`);
      lines.push("以下按能力分组，列出每组成员（≥2 个即疑似冗余/冲突）：");

      let flagged = 0;
      for (const c of CATEGORIES) {
        const members = byCategory.get(c.id) ?? [];
        if (members.length < 2) continue;
        flagged += 1;
        lines.push("");
        lines.push(`■ ${c.label}（${members.length} 个）`);
        for (const m of members) {
          const src = m.source ?? "?";
          const desc = (m.description ?? "").replace(/\s+/g, " ").slice(0, 90);
          lines.push(`  - ${m.name}  [${src}]  ${desc}`);
        }
      }

      if (flagged === 0) lines.push("\n未发现明显的功能重叠。");
      lines.push(`\n未分类（${uncategorized.length} 个）：${uncategorized.map((s) => s.name).join(", ") || "无"}`);
      lines.push("\n提示：以上为关键词启发式分组，仅供收敛冗余时参考；删除前请先核对每个 skill 的实际来源。");
      return lines.join("\n");
    },
  });
}
