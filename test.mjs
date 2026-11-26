import { apply } from "./index.js";

const mockSkills = [
  { name: "web-search", source: "bundled", description: "Search the web for current information. Returns a summary answer and source URLs." },
  { name: "tavily", source: "user-dsh", description: "AI-optimized web search using Tavily Search API. Best for research, current events, domain-specific search." },
  { name: "tencent-yuanbao-standard-search", source: "user-dsh", description: "Search the web using TencentCloud Web Search API (WSA). Prioritize using it when you need to retrieve network information." },
  { name: "ai-research", source: "bundled", description: "使用联网搜索与 AI 推理研究任意主题，检索最新多源信息、核查原始证据、事实核查、趋势分析。" },
  { name: "deeplysearch-research", source: "custom", description: "Guide the agent through multi-source research, evidence mapping, counterevidence checks, writing, and citation review." },
  { name: "office-docx", source: "bundled", description: "Create, read, edit, and validate Word documents (.docx)." },
  { name: "office-pptx", source: "bundled", description: "Create, read, edit, and validate PowerPoint presentations (.pptx)." },
  { name: "office-xlsx", source: "bundled", description: "Create, read, edit, and validate Excel workbooks (.xlsx)." },
  { name: "reviewing-code", source: "bundled", description: "当代码实现完成后，需要进行代码评审时使用，检查规范、逻辑、性能、安全。" },
  { name: "archify", source: "custom", description: "Create validated architecture, workflow, sequence, data-flow, ERD, class, tree, timeline, and waterfall diagrams as explorable standalone HTML." },
  { name: "architecture-design-helper", source: "custom", description: "架构风格选型、4+1视图建模、UML设计图选型、设计模式应用。" },
  { name: "weather", source: "custom", description: "Get current weather." },
];

const ctx = {
  skills: {
    list: async () => mockSkills,
    get: async () => undefined,
  },
};

let registered;
apply({
  tools: {
    register(def) {
      registered = def;
      return () => {};
    },
  },
  skills: ctx.skills,
});

const out = await registered.execute();
console.log(out);
