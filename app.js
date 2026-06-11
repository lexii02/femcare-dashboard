const DATA_PATH = `${import.meta.env.BASE_URL}data/FemCare_SIGNAL_LOG.md`;

const brandLibrary = [
  { name: "苏菲", role: "核心关注品牌", focus: "夜用产品、安睡裤、IP角色、经期管理", highlighted: true },
  { name: "护舒宝", role: "国内重点竞品", focus: "卫生巾、科普内容、青春期教育", highlighted: false },
  { name: "乐而雅", role: "国内重点竞品", focus: "舒适感、夜用产品、女性生活方式", highlighted: false },
  { name: "高洁丝", role: "国际/国内关注品牌", focus: "竞品案例、经期管理、情绪价值", highlighted: false },
  { name: "七度空间", role: "国内重点竞品", focus: "青春期教育、校园场景、安睡裤", highlighted: false },
  { name: "自由点", role: "国内重点竞品", focus: "夜用产品、安睡裤、防漏", highlighted: false },
  { name: "ABC", role: "国内重点竞品", focus: "私密健康、舒适感、产品功能", highlighted: false },
  { name: "全棉时代", role: "材质关注品牌", focus: "材质创新、舒适感、科普内容", highlighted: false },
  { name: "Kotex", role: "国际参照品牌", focus: "竞品案例、女性态度、经期教育", highlighted: true },
  { name: "Laurier", role: "国际参照品牌", focus: "舒适感、夜用产品、生活方式", highlighted: true },
  { name: "Gigi Supplements", role: "跨品类新势力", focus: "PMS、经前情绪、经期管理", highlighted: true },
  { name: "Beam Glow", role: "跨品类新势力", focus: "PMS、情绪价值、经前情绪", highlighted: true }
];

const tagConfig = window.TAG_CONFIG;
const enabledTagConfigs = tagConfig.tags.filter((tag) => tag.enabled);
const contentTagGroups = groupEnabledTags(enabledTagConfigs);
const fixedContentTags = enabledTagConfigs.map((tag) => tag.label);
const tagOrderByLabel = new Map(enabledTagConfigs.map((tag, index) => [tag.label, index]));
const contentTagLookup = buildContentTagLookup(enabledTagConfigs);
const trendCategoryLookup = buildCanonicalLookup(tagConfig.trendCategories);

const state = {
  query: "",
  weekStart: "2026-06-08",
  brand: "全部品牌",
  tags: [],
  openTagGroups: ["女性健康类"],
  tab: "timeline",
  expanded: 1,
  sort: "new",
  signals: [],
  reportMeta: {
    generatedDate: "",
    windowText: "",
    sourcePath: DATA_PATH
  },
  loading: true,
  loadError: ""
};

let searchRenderTimer = null;
let isComposingSearch = false;
let searchSelection = { start: null, end: null };

initDashboard();

async function initDashboard() {
  render();

  try {
    const markdown = await loadMarkdown();
    let parsed;
    try {
      parsed = parseSignalMarkdown(markdown);
    } catch (error) {
      throw new Error("Markdown读取成功，但解析失败");
    }
    if (parsed.signals.length === 0) {
      throw new Error("Markdown读取成功，但解析失败");
    }
    state.signals = parsed.signals;
    state.reportMeta = {
      ...state.reportMeta,
      ...parsed.meta
    };
    const defaultDate = parsed.meta.generatedDate || toIsoDate(new Date());
    state.weekStart = getMonday(parseIsoDate(defaultDate)).iso;
    state.expanded = parsed.signals[0]?.id || null;
    state.loading = false;
    state.loadError = "";
  } catch (error) {
    state.loading = false;
    state.loadError = error.message || "无法读取周报 Markdown 文件。";
  }

  render();
}

async function loadMarkdown() {
  const response = await fetch(DATA_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取周报 Markdown：HTTP ${response.status}`);
  }

  const text = await response.text();
  console.log("markdown length", text.length);
  console.log("markdown preview", text.slice(0, 100));

  if (text.trim().length === 0) {
    throw new Error("Markdown为空");
  }

  return text;
}

function parseSignalMarkdown(markdown) {
  const clean = markdown.replace(/\r\n/g, "\n");
  const meta = parseReportMeta(clean);
  const sections = splitSignalSections(clean);

  return {
    meta,
    signals: sections.map((section, index) => normalizeSignalTags(parseSignalSection(section, index + 1, meta)))
  };
}

function parseReportMeta(markdown) {
  const generatedDate =
    markdown.match(/生成日期[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1] ||
    markdown.match(/生成日期[:：]\s*([0-9]{4}\/[0-9]{2}\/[0-9]{2})/)?.[1]?.replaceAll("/", "-") ||
    "";
  const windowText =
    markdown.match(/检索窗口[:：]\s*([^\n]+)/)?.[1]?.trim() ||
    markdown.match(/监测窗口[:：]\s*([^\n]+)/)?.[1]?.trim() ||
    "";

  return {
    generatedDate,
    windowText
  };
}

function splitSignalSections(markdown) {
  const matches = [...markdown.matchAll(/^##\s+Signal\s+(\d+)[：:]\s*(.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index;
    const end = matches[index + 1]?.index ?? markdown.length;
    return {
      id: Number(match[1]),
      title: match[2].trim(),
      body: markdown.slice(start, end)
    };
  });
}

function parseSignalSection(section, fallbackId, meta) {
  const body = section.body;
  const categoryCandidates = splitListText(extractBlock(body, "行业信号判断"));
  const category =
    categoryCandidates.find((item) => trendCategoryLookup.has(normalizeTagKey(item))) ||
    "潜在风险信号";
  const rawTagCandidates = collectRawTagCandidates(body, categoryCandidates);
  const date = extractSignalDate(body) || meta.generatedDate || toIsoDate(new Date());

  return {
    id: section.id || fallbackId,
    date,
    title: section.title,
    summary: firstParagraph(extractBlock(body, "一句话说明发生了什么")) || firstParagraph(body),
    why: cleanBlock(extractBlock(body, "为什么值得关注")),
    insight: cleanBlock(extractBlock(body, "核心洞察")),
    category,
    brands: extractBrands(body),
    tags: rawTagCandidates,
    brandActions: extractBrandActions(extractBlock(body, "相关品牌动作")),
    sofie: extractSofieInsights(extractBlock(body, "对苏菲的启发")),
    proposal: firstParagraph(extractBlock(body, "可直接用于提案的一句话")),
    rawMarkdown: body
  };
}

function extractSignalDate(text) {
  return text.match(/日期[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1] || "";
}

function extractBlock(text, heading) {
  const escaped = escapeRegExp(heading);
  const match = text.match(new RegExp(`^###\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=^###\\s+|^---\\s*$|(?![\\s\\S]))`, "m"));
  return match?.[1]?.trim() || "";
}

function extractSubBlock(text, heading) {
  const escaped = escapeRegExp(heading);
  const match = text.match(new RegExp(`^####\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=^####\\s+|(?![\\s\\S]))`, "m"));
  return match?.[1]?.trim() || "";
}

function collectRawTagCandidates(body, categoryCandidates) {
  const candidates = [
    ...categoryCandidates,
    ...splitListText(extractBlock(body, "值得持续追踪")),
    ...fixedContentTags.filter((tag) => body.includes(tag)),
    ...enabledTagConfigs.flatMap((tag) => tag.aliases.filter((alias) => body.includes(alias)))
  ];
  return dedupeByNormalizedKey(candidates);
}

function splitListText(text) {
  return text
    .replace(/[#>*`]/g, "")
    .split(/[\n、,，;；]/)
    .map((item) => item.replace(/^[-\s]+/, "").replace(/^[^：:]{1,12}[：:]/, "").trim())
    .filter(Boolean);
}

function cleanBlock(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function firstParagraph(text) {
  return cleanBlock(text).split("\n").find(Boolean) || "";
}

function extractBrands(body) {
  const knownBrands = brandLibrary.map((brand) => brand.name);
  const actionBrands = extractBrandActions(extractBlock(body, "相关品牌动作")).map((item) => item.brand);
  const mentionedBrands = knownBrands.filter((brand) => body.includes(brand));
  return dedupeByNormalizedKey([...actionBrands, ...mentionedBrands]);
}

function extractBrandActions(text) {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^-\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[：:]/);
      if (parts.length < 2) return null;
      return {
        brand: parts.shift().trim(),
        action: parts.join("：").trim()
      };
    })
    .filter((item) => item && item.brand && item.action);
}

function extractSofieInsights(text) {
  return {
    content: firstParagraph(extractSubBlock(text, "内容机会")),
    operations: firstParagraph(extractSubBlock(text, "运营机会")),
    ugc: firstParagraph(extractSubBlock(text, "UGC机会")),
    ip: firstParagraph(extractSubBlock(text, "IP机会")),
    risk: firstParagraph(extractSubBlock(text, "风险提醒"))
  };
}

function normalizeSignalTags(signal) {
  const unknownTags = [];
  const rawTags = signal.tags || [];
  const categoryKey = normalizeTagKey(signal.category);
  const category = trendCategoryLookup.get(categoryKey) || "潜在风险信号";

  if (!trendCategoryLookup.has(categoryKey)) {
    pushUnique(unknownTags, signal.category);
  }

  const tags = [];
  rawTags.forEach((rawTag) => {
    const canonical = resolveContentTag(rawTag);
    if (canonical) {
      pushUnique(tags, canonical);
      return;
    }
    if (!trendCategoryLookup.has(normalizeTagKey(rawTag))) {
      pushUnique(unknownTags, rawTag);
    }
  });

  return {
    ...signal,
    category,
    rawTags,
    tags,
    unknownTags
  };
}

function filteredSignals() {
  const q = state.query.trim().toLowerCase();
  let list = state.signals.filter((signal) => {
    const searchable = [
      signal.title,
      signal.summary,
      signal.why,
      signal.insight,
      signal.proposal,
      signal.category,
      ...signal.tags,
      ...signal.brands
    ]
      .join(" ")
      .toLowerCase();
    const matchQuery = !q || searchable.includes(q);
    const matchDate = inDateRange(signal);
    const matchBrand = state.brand === "全部品牌" || signal.brands.includes(state.brand);
    const matchTags =
      state.tags.length === 0 ||
      state.tags.every((tag) => signal.tags.includes(tag));
    return matchQuery && matchDate && matchBrand && matchTags;
  });

  return list.sort((a, b) => {
    if (state.sort === "old") return a.date.localeCompare(b.date);
    if (state.sort === "brand") return b.brands.length - a.brands.length;
    return b.date.localeCompare(a.date);
  });
}

function inDateRange(signal) {
  const range = currentWeekRange();
  return signal.date >= range.start && signal.date <= range.end;
}

function allBrands() {
  return ["全部品牌", ...new Set([...brandLibrary.map((brand) => brand.name), ...state.signals.flatMap((signal) => signal.brands)])];
}

function shiftWeek(direction) {
  state.weekStart = addDays(state.weekStart, direction * 7);
  render();
}

function resetFilters() {
  state.query = "";
  state.weekStart = getMonday(parseIsoDate(state.reportMeta.generatedDate || toIsoDate(new Date()))).iso;
  state.brand = "全部品牌";
  state.tags = [];
  state.openTagGroups = ["女性健康类"];
  state.sort = "new";
  render();
}

function toggleTag(tag) {
  state.tags = state.tags.includes(tag)
    ? state.tags.filter((item) => item !== tag)
    : [...state.tags, tag];
  render();
}

function toggleTagGroup(group) {
  state.openTagGroups = state.openTagGroups.includes(group)
    ? state.openTagGroups.filter((item) => item !== group)
    : [...state.openTagGroups, group];
  render();
}

function activeTokens() {
  const tokens = [];
  if (state.query) tokens.push(`搜索：${state.query}`);
  tokens.push(`周报周期：${formatWeekRange()}`);
  if (state.brand !== "全部品牌") tokens.push(`品牌：${state.brand}`);
  state.tags.forEach((tag) => tokens.push(`标签：${tag}`));
  return tokens;
}

function render(options = {}) {
  const list = filteredSignals();
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="workspace">
        ${renderMetrics(list)}
        <div class="layout">
          ${renderFilters()}
          <section>
            ${renderTabs()}
            ${renderView(list)}
          </section>
        </div>
      </main>
    </div>
  `;
  bindEvents();
  restoreSearchFocus(options);
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand-row">
          <div class="brand-mark">
            <div class="mark-dot">F</div>
            <div>
              <h1>FemCare Signal Log</h1>
              <p class="subtitle">女性护理行业趋势监测 Dashboard</p>
            </div>
          </div>
          <div class="date-chip">${escapeHtml(state.reportMeta.windowText || `数据源：${state.reportMeta.sourcePath}`)}</div>
        </div>
        <div class="filter-toolbar">
          <div class="field">
            <label for="query">全局搜索</label>
            <input id="query" class="input" type="search" value="${escapeHtml(state.query)}" placeholder="搜索趋势、品牌、洞察、标签" />
          </div>
          <div class="field">
            <label>当前周报周期</label>
            <div class="week-readout">${formatWeekRange()}</div>
          </div>
          <div class="field">
            <label for="brandSelect">品牌库</label>
            <select id="brandSelect" class="select">
              ${allBrands().map((brand) => option(brand, brand, state.brand)).join("")}
            </select>
          </div>
          <button id="resetBtn" class="reset-btn" type="button">重置筛选</button>
        </div>
      </div>
    </header>
  `;
}

function renderMetrics(list) {
  const brandCount = new Set(list.flatMap((signal) => signal.brands)).size;
  const tagCount = new Set(list.flatMap((signal) => signal.tags)).size;
  const unknownCount = new Set(list.flatMap((signal) => signal.unknownTags)).size;
  return `
    <section class="summary-grid">
      ${metric(list.length, "匹配信号")}
      ${metric(brandCount, "涉及品牌")}
      ${metric(tagCount, "内容标签")}
      ${metric(unknownCount, "待归类标签")}
    </section>
  `;
}

function renderFilters() {
  return `
    <aside class="filter-panel">
      <div class="panel-title">
        <h2>筛选工作台</h2>
        <span class="panel-note">${filteredSignals().length} 条结果</span>
      </div>
      <label class="section-label">周报周期</label>
      <div class="week-switcher">
        <button id="prevWeek" class="week-btn" type="button">上一周</button>
        <div class="week-range">${formatWeekRange()}</div>
        <button id="nextWeek" class="week-btn" type="button">下一周</button>
      </div>
      <label class="section-label">内容标签</label>
      ${renderContentTagFilters()}
      <div class="active-filters">
        ${activeTokens().map((token) => `<span class="filter-token">${escapeHtml(token)}</span>`).join("")}
      </div>
      ${renderUnknownTagDebug()}
    </aside>
  `;
}

function renderContentTagFilters() {
  return Object.entries(contentTagGroups)
    .map(([group, tags]) => {
      const isOpen = state.openTagGroups.includes(group);
      const selectedCount = tags.filter((tag) => state.tags.includes(tag)).length;
      return `
        <div class="tag-group">
          <button class="tag-group-title" data-tag-group="${escapeHtml(group)}" type="button">
            <span>${escapeHtml(group)}${selectedCount > 0 ? `（${selectedCount}）` : ""}</span>
            <span class="tag-group-arrow">${isOpen ? "↑" : "↓"}</span>
          </button>
          ${
            isOpen
              ? `<div class="pill-group">${tags.map((tag) => pill(tag, state.tags.includes(tag))).join("")}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderUnknownTagDebug() {
  const unknown = unknownTagSummary(filteredSignals());
  if (unknown.length === 0) return "";

  return `
    <div class="debug-panel">
      <div class="debug-title">开发调试：unknownTags</div>
      <p>以下词来自 Markdown，但未命中固定标签库，已隐藏于前台筛选和标签热度。</p>
      <div class="debug-tags">
        ${unknown.map(([tag, count]) => `<span>${escapeHtml(tag)} × ${count}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderTabs() {
  const tabs = [
    ["timeline", "趋势时间轴"],
    ["brands", "品牌库"],
    ["stats", "女性议题统计"],
    ["ideas", "提案灵感池"]
  ];
  return `
    <nav class="tabs">
      ${tabs
        .map(
          ([key, label]) =>
            `<button class="tab ${state.tab === key ? "active" : ""}" data-tab="${key}" type="button">${label}</button>`
        )
        .join("")}
    </nav>
  `;
}

function renderView(list) {
  if (state.loading) return emptyState("正在读取 /data/FemCare_SIGNAL_LOG.md...");
  if (state.loadError) return emptyState(state.loadError);
  if (state.tab === "brands") return renderBrandLibrary(list);
  if (state.tab === "stats") return renderStats(list);
  if (state.tab === "ideas") return renderIdeas(list);
  return renderTimeline(list);
}

function renderTimeline(list) {
  return `
    <div class="view-header">
      <div>
        <h2>趋势时间轴</h2>
        <p>页面内容来自 /data/FemCare_SIGNAL_LOG.md，按周报周期、品牌、内容标签和搜索词筛选。</p>
      </div>
      <div class="sort-row">
        <select id="sortSelect" class="select">
          ${option("new", "最新优先", state.sort)}
          ${option("old", "最早优先", state.sort)}
          ${option("brand", "涉及品牌最多", state.sort)}
        </select>
      </div>
    </div>
    <div class="signal-list">
      ${
        list.length === 0
          ? emptyState("本周暂无记录")
          : list.map(renderSignalCard).join("")
      }
    </div>
  `;
}

function renderSignalCard(signal) {
  const expanded = state.expanded === signal.id;
  const visibleTags = signal.tags.slice(0, 5);
  return `
    <article class="signal-card ${expanded ? "expanded" : ""}">
      <div class="signal-main">
        <div class="signal-topline">
          <div>
            <div class="signal-kicker">Signal ${signal.id} · ${signal.date} · ${escapeHtml(signal.category)}</div>
            <h3>${escapeHtml(signal.title)}</h3>
          </div>
          <button class="icon-btn" data-expand="${signal.id}" type="button">${expanded ? "收起" : "展开"}</button>
        </div>
        <p class="summary">${escapeHtml(signal.summary)}</p>
        <div class="signal-meta">
          <span class="meta trend">${escapeHtml(signal.category)}</span>
          ${visibleTags.map((item) => `<span class="meta">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="details">
        <div class="details-grid">
          ${detailBox("为什么值得关注", signal.why)}
          ${detailBox("核心洞察", signal.insight)}
          <div class="detail-box full">
            <h4>相关品牌动作</h4>
            ${
              signal.brandActions.length
                ? `<ul>${signal.brandActions.map((item) => `<li><strong>${escapeHtml(item.brand)}：</strong>${escapeHtml(item.action)}</li>`).join("")}</ul>`
                : "<p>Markdown 中暂无相关品牌动作。</p>"
            }
          </div>
          <div class="detail-box full">
            <h4>对苏菲的启发</h4>
            <ul>
              <li><strong>内容机会：</strong>${escapeHtml(signal.sofie.content || "暂无")}</li>
              <li><strong>运营机会：</strong>${escapeHtml(signal.sofie.operations || "暂无")}</li>
              <li><strong>UGC机会：</strong>${escapeHtml(signal.sofie.ugc || "暂无")}</li>
              <li><strong>IP机会：</strong>${escapeHtml(signal.sofie.ip || "暂无")}</li>
              <li><strong>风险提醒：</strong>${escapeHtml(signal.sofie.risk || "暂无")}</li>
            </ul>
          </div>
          <div class="detail-box full">
            <h4>可直接用于提案的一句话</h4>
            <div class="quote">${escapeHtml(signal.proposal || "暂无")}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderBrandLibrary(list) {
  const activeNames = new Set(list.flatMap((signal) => signal.brands));
  const cards = brandLibrary
    .filter((brand) => state.brand === "全部品牌" || brand.name === state.brand || activeNames.has(brand.name))
    .map((brand) => {
      const count = list.filter((signal) => signal.brands.includes(brand.name)).length;
      const active = count > 0;
      return `
        <article class="brand-card ${brand.highlighted || active ? "highlight" : ""}">
          <div class="brand-head">
            <div>
              <div class="brand-name">${escapeHtml(brand.name)}</div>
              <div class="brand-role">${escapeHtml(brand.role)}</div>
            </div>
            <span class="status ${active ? "active" : "watch"}">${active ? `${count} 条信号` : "观察中"}</span>
          </div>
          <p><strong>关注方向：</strong>${escapeHtml(brand.focus)}</p>
          <p style="margin-top:8px;"><strong>本期判断：</strong>${active ? "当前周报中出现相关信号，建议持续追踪。" : "当前筛选周期内未命中高价值信号。"}</p>
          <div class="watch-tags">
            ${brand.focus.split("、").map((tag) => `<span class="watch-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
  return `
    <div class="view-header">
      <div>
        <h2>品牌库</h2>
        <p>品牌状态由当前 Markdown 周报解析结果实时生成。</p>
      </div>
    </div>
    <div class="brand-grid">${cards || emptyState("当前筛选条件下暂无品牌命中。")}</div>
  `;
}

function renderStats(list) {
  const categoryCounts = countBy(list.map((signal) => signal.category));
  const brandCounts = countBy(list.flatMap((signal) => signal.brands));
  const tagCounts = countTagsByLibraryOrder(list);
  return `
    <div class="view-header">
      <div>
        <h2>女性议题统计</h2>
        <p>只统计当前 Markdown 中真实命中的固定标签，不展示未命中或未收录标签。</p>
      </div>
    </div>
    <div class="chart-grid">
      ${chartCard("趋势分类集中度", categoryCounts)}
      ${chartCard("品牌出现频次", brandCounts)}
      ${tagHeatCard(tagCounts)}
      ${chartCard("苏菲机会类型", countBy(list.flatMap(() => ["内容机会", "运营机会", "UGC机会", "IP机会"])))}
    </div>
  `;
}

function renderIdeas(list) {
  const ideas = list.flatMap((signal) => [
    ["内容机会", signal.sofie.content, signal],
    ["运营机会", signal.sofie.operations, signal],
    ["UGC机会", signal.sofie.ugc, signal],
    ["IP机会", signal.sofie.ip, signal],
    ["风险提醒", signal.sofie.risk, signal],
    ["提案金句", signal.proposal, signal]
  ]).filter(([, text]) => text);
  return `
    <div class="view-header">
      <div>
        <h2>提案灵感池</h2>
        <p>从当前 Markdown 周报中提取对苏菲的启发与提案金句。</p>
      </div>
    </div>
    <div class="insight-grid">
      ${
        ideas.length
          ? ideas
              .map(
                ([type, text, signal]) => `
          <article class="insight-card">
            <span class="insight-type">${escapeHtml(type)}</span>
            <p>${escapeHtml(text)}</p>
            <p class="summary">来源：Signal ${signal.id} · ${escapeHtml(signal.title)}</p>
          </article>
        `
              )
              .join("")
          : emptyState("当前筛选条件下暂无提案灵感。")
      }
    </div>
  `;
}

function bindEvents() {
  const query = document.querySelector("#query");
  if (query) {
    query.addEventListener("compositionstart", () => {
      isComposingSearch = true;
      clearSearchRenderTimer();
    });

    query.addEventListener("compositionend", (event) => {
      isComposingSearch = false;
      updateSearchState(event.target);
      render({ restoreSearchFocus: true });
    });

    query.addEventListener("input", (event) => {
      updateSearchState(event.target);
      if (!isComposingSearch) {
        scheduleSearchRender();
      }
    });
  }

  document.querySelector("#brandSelect")?.addEventListener("change", (event) => {
    state.brand = event.target.value;
    render();
  });

  document.querySelector("#resetBtn")?.addEventListener("click", resetFilters);
  document.querySelector("#prevWeek")?.addEventListener("click", () => shiftWeek(-1));
  document.querySelector("#nextWeek")?.addEventListener("click", () => shiftWeek(1));

  document.querySelectorAll("[data-tag-group]").forEach((button) => {
    button.addEventListener("click", () => toggleTagGroup(button.dataset.tagGroup));
  });

  document.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => toggleTag(button.dataset.tag));
  });

  document.querySelectorAll("[data-heat-tag]").forEach((button) => {
    button.addEventListener("click", () => toggleTag(button.dataset.heatTag));
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.expand);
      state.expanded = state.expanded === id ? null : id;
      render();
    });
  });

  document.querySelector("#sortSelect")?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
}

function updateSearchState(input) {
  state.query = input.value;
  searchSelection = {
    start: input.selectionStart,
    end: input.selectionEnd
  };
}

function scheduleSearchRender() {
  clearSearchRenderTimer();
  searchRenderTimer = window.setTimeout(() => {
    searchRenderTimer = null;
    render({ restoreSearchFocus: true });
  }, 160);
}

function clearSearchRenderTimer() {
  if (searchRenderTimer !== null) {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
}

function restoreSearchFocus(options) {
  if (!options.restoreSearchFocus) return;
  const query = document.querySelector("#query");
  if (!query) return;
  query.focus({ preventScroll: true });
  const start = searchSelection.start ?? query.value.length;
  const end = searchSelection.end ?? query.value.length;
  query.setSelectionRange(start, end);
}

function resolveContentTag(rawTag) {
  const key = normalizeTagKey(rawTag);
  const tag = contentTagLookup.get(key);
  return tag ? tag.label : null;
}

function buildCanonicalLookup(items) {
  return new Map(items.map((item) => [normalizeTagKey(item), item]));
}

function buildContentTagLookup(tags) {
  const lookup = new Map();
  tags.forEach((tag) => {
    lookup.set(normalizeTagKey(tag.label), tag);
    tag.aliases.forEach((alias) => {
      lookup.set(normalizeTagKey(alias), tag);
    });
  });
  return lookup;
}

function groupEnabledTags(tags) {
  return tags.reduce((groups, tag) => {
    if (!groups[tag.group]) groups[tag.group] = [];
    groups[tag.group].push(tag.label);
    return groups;
  }, {});
}

function normalizeTagKey(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function pushUnique(list, value) {
  const key = normalizeTagKey(value);
  if (value && !list.some((item) => normalizeTagKey(item) === key)) {
    list.push(value);
  }
}

function dedupeByNormalizedKey(items) {
  return items.reduce((list, item) => {
    pushUnique(list, item);
    return list;
  }, []);
}

function unknownTagSummary(list) {
  const summary = new Map();
  list.flatMap((signal) => signal.unknownTags).forEach((tag) => {
    const key = normalizeTagKey(tag);
    const current = summary.get(key);
    if (current) {
      current.count += 1;
      return;
    }
    summary.set(key, { label: tag, count: 1 });
  });
  return [...summary.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((item) => [item.label, item.count]);
}

function currentWeekRange() {
  return {
    start: state.weekStart,
    end: addDays(state.weekStart, 6)
  };
}

function formatWeekRange() {
  const range = currentWeekRange();
  return `${formatDateSlash(range.start)} - ${formatDateSlash(range.end)}`;
}

function getMonday(date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = localDate.getDay() || 7;
  localDate.setDate(localDate.getDate() - day + 1);
  return {
    date: localDate,
    iso: toIsoDate(localDate)
  };
}

function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function parseIsoDate(isoDate) {
  if (!isoDate) return new Date();
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateSlash(isoDate) {
  return isoDate.replaceAll("-", "/");
}

function option(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function pill(label, active) {
  return `<button class="pill ${active ? "active" : ""}" data-tag="${escapeHtml(label)}" type="button">${escapeHtml(label)}</button>`;
}

function metric(value, label) {
  return `
    <div class="metric">
      <div class="metric-value">${value}</div>
      <div class="metric-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function detailBox(title, text) {
  return `
    <div class="detail-box">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text || "暂无")}</p>
    </div>
  `;
}

function chartCard(title, counts) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return `
    <section class="chart-card">
      <h3>${escapeHtml(title)}</h3>
      ${
        rows.length === 0
          ? "<p class=\"summary\">暂无数据</p>"
          : rows
              .map(
                ([label, count]) => `
          <div class="bar-row">
            <span>${escapeHtml(label)}</span>
            <div class="bar"><span style="width:${Math.max(8, (count / max) * 100)}%"></span></div>
            <strong>${count}</strong>
          </div>
        `
              )
              .join("")
      }
    </section>
  `;
}

function tagHeatCard(rows) {
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return `
    <section class="chart-card">
      <h3>标签热度</h3>
      ${
        rows.length === 0
          ? "<p class=\"summary\">暂无命中的固定标签</p>"
          : rows
              .map(([label, count]) => {
                const active = state.tags.includes(label);
                return `
          <button class="bar-row heat-row ${active ? "active" : ""}" data-heat-tag="${escapeHtml(label)}" type="button">
            <span>${escapeHtml(label)}</span>
            <div class="bar"><span style="width:${Math.max(8, (count / max) * 100)}%"></span></div>
            <strong>${count}</strong>
          </button>
        `;
              })
              .join("")
      }
    </section>
  `;
}

function countTagsByLibraryOrder(list) {
  const counts = countBy(list.flatMap((signal) => signal.tags));
  return fixedContentTags
    .filter((tag) => counts[tag] > 0)
    .map((tag) => [tag, counts[tag]])
    .sort((a, b) => b[1] - a[1] || tagOrderByLabel.get(a[0]) - tagOrderByLabel.get(b[0]));
}

function countBy(items) {
  return items.reduce((acc, item) => {
    if (item) acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
