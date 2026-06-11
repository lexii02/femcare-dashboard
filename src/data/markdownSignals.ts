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

const EMPTY_DATE_RANGE: DateRange = {
  start: '',
  end: '',
  generated: '',
};

export async function fetchSignalMarkdown(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/FemCare_SIGNAL_LOG.md`);

  if (!response.ok) {
    throw new Error(`无法读取周报 Markdown：HTTP ${response.status}`);
  }

  const text = await response.text();
  console.log('markdown length', text.length);
  console.log('markdown preview', text.slice(0, 100));

  if (text.trim().length === 0) {
    throw new Error('Markdown为空');
  }

  return text;
}

export function parseSignalMarkdown(markdown: string): MarkdownDashboardData {
  const signals = parseSignals(markdown);

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
  const signalMatches = Array.from(markdown.matchAll(/^##\s+Signal\s+(\d+).*$/gim));

  return signalMatches.map((match, index) => {
    const nextMatch = signalMatches[index + 1];
    const block = markdown.slice(match.index ?? 0, nextMatch?.index ?? markdown.length);
    const heading = match[0].trim();
    const id = Number(match[1]);
    const title = cleanText(heading.replace(/^##\s+Signal\s+\d+\s*[:：锛歭]?\s*/i, ''));
    const sections = getLevelThreeSections(block);
    const sofieSection = sections.find(section => /苏菲|鑻忚彶|Sofie/i.test(section.heading));
    const sofieInsights = sofieSection ? parseSofieInsights(sofieSection.content) : {};

    return {
      id,
      title: title || `Signal ${id}`,
      summary: getSectionContent(sections, 0),
      whyItMatters: getSectionContent(sections, 1),
      coreInsight: getSectionContent(sections, 2),
      industrySignals: parseListLikeText(getSectionContent(sections, 3)).slice(0, 5),
      brandActions: parseBrandActions(getSectionContent(sections, 4)),
      tracking: parseTracking(getSectionContent(sections, 5)),
      sofieInsights,
      proposalLine: getSectionContent(sections, 7),
      strategicNote: getSectionContent(sections, 8),
    };
  });
}

function getLevelThreeSections(block: string) {
  const headingMatches = Array.from(block.matchAll(/^###\s+(.+)$/gim));

  return headingMatches.map((match, index) => {
    const nextMatch = headingMatches[index + 1];
    const content = block.slice(
      (match.index ?? 0) + match[0].length,
      nextMatch?.index ?? block.length
    );

    return {
      heading: cleanText(match[1]),
      content: cleanSection(content),
    };
  });
}

function getSectionContent(sections: Array<{ content: string }>, index: number) {
  return sections[index]?.content ?? '';
}

function parseBrandActions(text: string) {
  const actions = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/[:：锛]/);

      if (parts.length < 2) {
        return { brand: '相关品牌', action: cleanText(line) };
      }

      return {
        brand: cleanText(parts.shift() ?? '相关品牌'),
        action: cleanText(parts.join('：')),
      };
    })
    .filter(action => action.action);

  return actions.length > 0 ? actions : [{ brand: '相关品牌', action: text }];
}

function parseTracking(text: string): Signal['tracking'] {
  const lines = text.split(/\n+/).map(line => cleanText(line)).filter(Boolean);
  const buckets = lines.map(line => parseListLikeText(line.replace(/^[^:：锛]+[:：锛]\s*/, '')));

  return {
    brands: buckets[0] ?? [],
    topics: buckets[1] ?? [],
    kols: buckets[2] ?? [],
    userGroups: buckets[3] ?? [],
    platformPlays: buckets[4] ?? [],
  };
}

function parseSofieInsights(text: string): Signal['sofieInsights'] {
  const subSections = Array.from(text.matchAll(/^####\s+(.+)$/gim));
  const values = subSections.map((match, index) => {
    const nextMatch = subSections[index + 1];
    return cleanSection(text.slice((match.index ?? 0) + match[0].length, nextMatch?.index ?? text.length));
  });

  return {
    content: values[0],
    operations: values[1],
    ugc: values[2],
    ip: values[3],
    risks: values[4],
  };
}

function parseListLikeText(text: string): string[] {
  return cleanText(text)
    .split(/[、,，;；\n]+/)
    .map(item => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function cleanSection(text: string) {
  return text
    .replace(/^####\s+.+$/gim, '')
    .split(/\n+/)
    .map(line => cleanText(line))
    .filter(Boolean)
    .join('\n');
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[-*]\s*/, '')
    .trim();
}
