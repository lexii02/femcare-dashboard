export interface Signal {
  id: number;
  title: string;
  summary: string;
  whyItMatters: string;
  coreInsight: string;
  industrySignals: string[];
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
  proposalLine: string;
  strategicNote: string;
}

export interface DateRange {
  start: string;
  end: string;
  generated: string;
}

export interface MarkdownDashboardData {
  signals: Signal[];
  dateRange: DateRange;
}

interface MarkdownSection {
  heading: string;
  content: string;
}

const EMPTY_DATE_RANGE: DateRange = {
  start: '',
  end: '',
  generated: '',
};

export async function fetchSignalMarkdown(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/FemCare_SIGNAL_LOG.md`);

  if (!response.ok) {
    throw new Error(`Unable to read weekly Markdown: HTTP ${response.status}`);
  }

  const text = await response.text();
  console.log('markdown length', text.length);

  if (text.trim().length === 0) {
    throw new Error('Markdown is empty');
  }

  return text;
}

export function parseSignalMarkdown(markdown: string): MarkdownDashboardData {
  const signals = parseSignals(markdown);
  console.log('parsed signals count', signals.length);

  return {
    signals,
    dateRange: parseDateRange(markdown),
  };
}

function parseDateRange(markdown: string): DateRange {
  const dates = Array.from(markdown.matchAll(/\d{4}-\d{2}-\d{2}/g), match => match[0]);

  if (dates.length >= 3) {
    return {
      generated: dates[0],
      start: dates[1],
      end: dates[2],
    };
  }

  if (dates.length >= 2) {
    return {
      generated: dates[0],
      start: dates[0],
      end: dates[1],
    };
  }

  if (dates.length === 1) {
    return {
      generated: dates[0],
      start: dates[0],
      end: dates[0],
    };
  }

  return EMPTY_DATE_RANGE;
}

function parseSignals(markdown: string): Signal[] {
  return splitSignals(markdown).map((signalBlock, index) => {
    const headingLine = firstLine(signalBlock);
    const id = parseSignalId(headingLine) ?? index + 1;
    const title = parseSignalTitle(headingLine, id);
    const sections = splitSections(signalBlock, 3);

    const summary = sectionByHeading(sections, ['一句话'])?.content ?? sectionByOrder(sections, 0);
    const whyItMatters = sectionByHeading(sections, ['为什么值得关注'])?.content ?? sectionByOrder(sections, 1);
    const coreInsight = sectionByHeading(sections, ['核心洞察'])?.content ?? sectionByOrder(sections, 2);
    const industrySignalsText = sectionByHeading(sections, ['行业信号判断'])?.content ?? sectionByOrder(sections, 3);
    const brandActionsText = sectionByHeading(sections, ['相关品牌动作'])?.content ?? sectionByOrder(sections, 4);
    const trackingText = sectionByHeading(sections, ['值得持续追踪'])?.content ?? sectionByOrder(sections, 5);
    const sofieText = sectionByHeading(sections, ['对苏菲的启发', '对苏菲'])?.content ?? '';
    const proposalLine = sectionByHeading(sections, ['可直接用于提案'])?.content ?? sectionByOrder(sections, 7);
    const strategicNote = sectionByHeading(sections, ['Strategic Note'])?.content ?? sectionByOrder(sections, 8);

    return {
      id,
      title,
      summary,
      whyItMatters,
      coreInsight,
      industrySignals: parseListLikeText(industrySignalsText).slice(0, 5),
      brandActions: parseBrandActions(brandActionsText),
      tracking: parseTracking(trackingText),
      sofieInsights: parseSofieInsights(sofieText),
      proposalLine,
      strategicNote,
    };
  });
}

function splitSignals(markdown: string): string[] {
  const signalHeadings = Array.from(markdown.matchAll(/^##\s+Signal\s+\d+\b.*$/gim));

  return signalHeadings.map((match, index) => {
    const start = match.index ?? 0;
    const end = signalHeadings[index + 1]?.index ?? markdown.length;
    return markdown.slice(start, end).trim();
  });
}

function splitSections(block: string, level: 3): MarkdownSection[] {
  const marker = '#'.repeat(level);
  const sectionHeadings = Array.from(block.matchAll(new RegExp(`^${marker}\\s+(.+)$`, 'gim')));

  return sectionHeadings.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = sectionHeadings[index + 1]?.index ?? block.length;

    return {
      heading: cleanText(match[1]),
      content: cleanBlock(block.slice(start, end)),
    };
  });
}

function splitSubsections(block: string, level: 4): MarkdownSection[] {
  const marker = '#'.repeat(level);
  const sectionHeadings = Array.from(block.matchAll(new RegExp(`^${marker}\\s+(.+)$`, 'gim')));

  return sectionHeadings.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = sectionHeadings[index + 1]?.index ?? block.length;

    return {
      heading: cleanText(match[1]),
      content: cleanBlock(block.slice(start, end)),
    };
  });
}

function sectionByHeading(sections: MarkdownSection[], keywords: string[]) {
  return sections.find(section =>
    keywords.some(keyword => normalizeText(section.heading).includes(normalizeText(keyword)))
  );
}

function sectionByOrder(sections: MarkdownSection[], index: number) {
  return sections[index]?.content ?? '';
}

function parseSignalId(heading: string): number | null {
  const match = heading.match(/^##\s+Signal\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseSignalTitle(heading: string, id: number) {
  const title = cleanText(heading.replace(/^##\s+Signal\s+\d+\s*[:：]\s*/i, ''));
  return title || `Signal ${id}`;
}

function parseBrandActions(text: string) {
  const actions = cleanLines(text)
    .map(line => {
      const match = line.match(/^([^:：]+)[:：]\s*(.+)$/);

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
  const brands = parseTrackingLine(lines, ['品牌']);
  const topics = parseTrackingLine(lines, ['话题']);
  const kols = parseTrackingLine(lines, ['KOL']);
  const userGroups = parseTrackingLine(lines, ['用户圈层']);
  const platformPlays = parseTrackingLine(lines, ['平台玩法']);

  return {
    brands,
    topics,
    kols,
    userGroups,
    platformPlays,
  };
}

function parseTrackingLine(lines: string[], keywords: string[]) {
  const line = lines.find(candidate =>
    keywords.some(keyword => normalizeText(candidate).includes(normalizeText(keyword)))
  );

  if (!line) {
    return [];
  }

  return parseListLikeText(line.replace(/^.*?[:：]\s*/, ''));
}

function parseSofieInsights(text: string): Signal['sofieInsights'] {
  const subSections = splitSubsections(text, 4);

  return {
    content: sectionByHeading(subSections, ['内容机会'])?.content,
    operations: sectionByHeading(subSections, ['运营机会'])?.content,
    ugc: sectionByHeading(subSections, ['UGC机会'])?.content,
    ip: sectionByHeading(subSections, ['IP机会'])?.content,
    risks: sectionByHeading(subSections, ['风险提醒'])?.content,
  };
}

function parseListLikeText(text: string): string[] {
  return cleanText(text)
    .split(/[、,，;；\n]+/)
    .map(item => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function cleanBlock(text: string) {
  return text
    .split(/\n+/)
    .map(line => cleanText(line))
    .filter(Boolean)
    .join('\n');
}

function cleanLines(text: string) {
  return text
    .split(/\n+/)
    .map(line => cleanText(line))
    .filter(Boolean);
}

function cleanText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*]\s*/, '')
    .trim();
}

function firstLine(text: string) {
  return text.split(/\n/)[0]?.trim() ?? '';
}

function normalizeText(text: string) {
  return cleanText(text)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '');
}
