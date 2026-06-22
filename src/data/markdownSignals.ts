import { tagConfig } from '../config/tagConfig';

export interface Signal {
  id: number;
  title: string;
  summary: string;
  whyImportant: string;
  whyItMatters: string;
  insight: string;
  coreInsight: string;
  category: string[];
  industrySignals: string[];
  tags: string[];
  relatedBrands: string[];
  brandActions: { brand: string; action: string }[];
  tracking: {
    brands: string[];
    topics: string[];
    kols: string[];
    userGroups: string[];
    platformPlays: string[];
  };
  sofieInsights: {
    content?: string;
    operations?: string;
    ugc?: string;
    ip?: string;
    risks?: string;
  };
  sophyOpportunity: {
    content?: string;
    operations?: string;
    ugc?: string;
    ip?: string;
    risks?: string;
  };
  proposalLine: string;
  strategicNote: string;
  signalDate: string;
  period: string;
}

export interface DateRange {
  start: string;
  end: string;
  generated: string;
}

export interface MarkdownDashboardData {
  signals: Signal[];
  dateRange: DateRange;
  reports: {
    dateRange: DateRange;
    signalCount: number;
  }[];
}

const EMPTY_DATE_RANGE: DateRange = {
  start: '',
  end: '',
  generated: '',
};

export async function fetchSignalMarkdown(): Promise<string> {
  const markdownUrl = `${import.meta.env.BASE_URL}data/FemCare_SIGNAL_LOG.md?v=${Date.now()}`;
  const response = await fetch(markdownUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`无法读取周报 Markdown：HTTP ${response.status}`);
  }

  const text = await response.text();
  console.log('markdown length', text.length);

  if (text.trim().length === 0) {
    throw new Error('Markdown为空');
  }

  return text;
}

export function parseSignalMarkdown(markdown: string): MarkdownDashboardData {
  const reports = parseReports(markdown);
  const signals = reports.flatMap(report => report.signals);
  const dateRange = reports[0]?.dateRange ?? parseDateRange(markdown);

  console.log('all reports', reports.map(({ dateRange, signals }) => ({
    dateRange,
    signalCount: signals.length,
  })));
  console.log('parsed signals count', signals.length);
  console.log('all signals', signals.length);
  console.log('signals by period', signals.map(signal => ({
    title: signal.title,
    period: signal.period,
  })));
  console.log('first parsed signal', signals[0] ?? null);

  if (markdown.trim().length > 0 && signals.length === 0) {
    throw new Error('Markdown读取成功，但未识别到Signal结构');
  }

  return {
    signals,
    dateRange,
    reports: reports.map(({ dateRange, signals }) => ({
      dateRange,
      signalCount: signals.length,
    })),
  };
}

function parseReports(markdown: string) {
  const reportPattern = /^# FemCare Signal Log\s*$/gm;
  const matches = Array.from(markdown.matchAll(reportPattern));

  if (matches.length === 0) {
    const dateRange = parseDateRange(markdown);

    return [{
      dateRange,
      signals: parseSignals(markdown, dateRange),
    }];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? markdown.length;
    const block = markdown.slice(start, end);
    const dateRange = parseDateRange(block);

    return {
      dateRange,
      signals: parseSignals(block, dateRange),
    };
  });
}

function parseDateRange(markdown: string): DateRange {
  const generated = markdown.match(/^生成日期：\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? '';
  const period = markdown.match(/^检索窗口：\s*(\d{4}-\d{2}-\d{2})\s*至\s*(\d{4}-\d{2}-\d{2})/m);

  if (generated || period) {
    return {
      generated,
      start: period?.[1] ?? generated,
      end: period?.[2] ?? generated,
    };
  }

  const dates = Array.from(markdown.matchAll(/\d{4}-\d{2}-\d{2}/g), match => match[0]);

  if (dates.length >= 3) {
    return { generated: dates[0], start: dates[1], end: dates[2] };
  }

  if (dates.length >= 2) {
    return { generated: dates[0], start: dates[0], end: dates[1] };
  }

  if (dates.length === 1) {
    return { generated: dates[0], start: dates[0], end: dates[0] };
  }

  return EMPTY_DATE_RANGE;
}

function parseSignals(markdown: string, dateRange: DateRange): Signal[] {
  return getSignalBlocks(markdown).map(({ id, title, block }) => {
    const summary = getSection(block, '一句话说明发生了什么。');
    const whyItMatters = getSection(block, '为什么值得关注');
    const coreInsight = getSection(block, '核心洞察');
    const industrySignals = splitList(getSection(block, '行业信号判断'));
    const brandActionsText = getSection(block, '相关品牌动作');
    const trackingText = getSection(block, '值得持续追踪');
    const sofieText = getRawSection(block, '对苏菲的启发（重点）');
    const proposalLine = getSection(block, '可直接用于提案的一句话');
    const strategicNote = getSection(block, 'Strategic Note');
    const tracking = parseTracking(trackingText);
    const brandActions = parseBrandActions(brandActionsText);
    const relatedBrands = brandActions.map(action => action.brand).filter(Boolean);
    const sophyOpportunity = parseSofieInsights(sofieText);
    const tags = matchFixedTags([
      title,
      summary,
      whyItMatters,
      coreInsight,
      industrySignals.join('、'),
      tracking.topics.join('、'),
      brandActions.map(action => `${action.brand} ${action.action}`).join('\n'),
      sofieText,
      proposalLine,
      strategicNote,
      dateRange.generated,
      `${dateRange.start} ${dateRange.end}`,
    ].join('\n'));

    return {
      id,
      title,
      summary,
      whyImportant: whyItMatters,
      whyItMatters,
      insight: coreInsight,
      coreInsight,
      category: industrySignals,
      industrySignals,
      tags,
      relatedBrands,
      brandActions,
      tracking,
      sofieInsights: sophyOpportunity,
      sophyOpportunity,
      proposalLine,
      strategicNote,
      signalDate: dateRange.generated,
      period: `${dateRange.start} 至 ${dateRange.end}`,
    };
  });
}

function getSignalBlocks(markdown: string) {
  const signalPattern = /^## Signal (\d+)：(.+)$/gm;
  const matches = Array.from(markdown.matchAll(signalPattern));

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? markdown.length;

    return {
      id: Number(match[1]),
      title: cleanText(match[2]),
      block: markdown.slice(start, end),
    };
  });
}

function getSection(block: string, heading: string): string {
  return cleanBlock(getRawSection(block, heading));
}

function getRawSection(block: string, heading: string): string {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(
    `^###\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^###\\s+|^##\\s+|(?![\\s\\S]))`,
    'm'
  );
  const match = block.match(pattern);

  return match ? match[1] : '';
}

function getSubsection(block: string, heading: string): string {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(
    `^####\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^####\\s+|^###\\s+|^##\\s+|(?![\\s\\S]))`,
    'm'
  );
  const match = block.match(pattern);

  return match ? cleanBlock(match[1]) : '';
}

function parseBrandActions(text: string) {
  const actions = cleanLines(text)
    .map(line => {
      const match = line.match(/^([^：:]+)[：:]\s*(.+)$/);

      if (!match) {
        return { brand: '相关品牌', action: line };
      }

      return {
        brand: cleanText(match[1]),
        action: cleanText(match[2]),
      };
    })
    .filter(action => action.action);

  return actions.length > 0 ? actions : [{ brand: '相关品牌', action: text }];
}

function parseTracking(text: string): Signal['tracking'] {
  const lines = cleanLines(text);

  return {
    brands: parseTrackingLine(lines, '追踪品牌'),
    topics: parseTrackingLine(lines, '追踪话题'),
    kols: parseTrackingLine(lines, '追踪KOL'),
    userGroups: parseTrackingLine(lines, '追踪用户圈层'),
    platformPlays: parseTrackingLine(lines, '追踪平台玩法'),
  };
}

function parseTrackingLine(lines: string[], label: string): string[] {
  const line = lines.find(item => item.startsWith(`${label}：`) || item.startsWith(`${label}:`));

  if (!line) {
    return [];
  }

  return splitList(line.replace(/^.*?[：:]\s*/, ''));
}

function parseSofieInsights(text: string): Signal['sofieInsights'] {
  return {
    content: getSubsection(text, '内容机会'),
    operations: getSubsection(text, '运营机会'),
    ugc: getSubsection(text, 'UGC机会'),
    ip: getSubsection(text, 'IP机会'),
    risks: getSubsection(text, '风险提醒'),
  };
}

function matchFixedTags(text: string): string[] {
  const normalizedText = normalizeText(text);

  return tagConfig
    .filter(tag => tag.enabled)
    .filter(tag => [tag.label, ...tag.aliases].some(alias => normalizedText.includes(normalizeText(alias))))
    .map(tag => tag.label);
}

function splitList(text: string): string[] {
  return cleanText(text)
    .split(/[、，,]/)
    .map(item => cleanText(item))
    .filter(Boolean);
}

function cleanBlock(text: string): string {
  return text
    .split(/\n+/)
    .filter(line => !isHorizontalRule(line))
    .map(line => cleanText(line))
    .filter(Boolean)
    .join('\n');
}

function cleanLines(text: string): string[] {
  return text
    .split(/\n+/)
    .filter(line => !isHorizontalRule(line))
    .map(line => cleanText(line))
    .filter(Boolean);
}

function cleanText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*]\s*/, '')
    .trim();
}

function normalizeText(text: string): string {
  return cleanText(text)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isHorizontalRule(text: string): boolean {
  return /^-{3,}\s*$/.test(text.trim());
}
