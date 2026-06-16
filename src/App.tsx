import { useEffect, useMemo, useState } from 'react';
import {
  DateRange,
  fetchSignalMarkdown,
  parseSignalMarkdown,
  Signal
} from './data/markdownSignals';
import {
  Search,
  Filter,
  Clock,
  TrendingUp,
  Tag,
  BookOpen,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Building2,
  Target,
  AlertCircle
} from 'lucide-react';

type TabType = 'timeline' | 'cases' | 'stats' | 'inspirations';

interface BrandCase {
  title: string;
  brand: string;
  action: string;
  reference: string;
  signalTitle: string;
  signalId: number;
  tags: string[];
}

interface ProposalIdea {
  type: '内容机会' | '运营机会' | 'UGC机会' | 'IP机会' | '风险提醒' | '提案金句';
  content: string;
  sourceSignal: string;
  signalNumber: number;
  tags: string[];
  category: string[];
  color: 'rose' | 'blue' | 'green' | 'purple' | 'amber' | 'slate';
}

interface WeekOption {
  label: string;
  start: string;
  end: string;
}

const GENERIC_BRAND_KEYWORDS = [
  '传统卫生巾品牌',
  '女性护理品牌',
  '苏菲及同类品牌',
  '同类品牌',
  '社媒平台与研究机构',
  'AI健康工具与研究机构',
  '研究机构',
  '相关品牌',
];

const NON_CASE_ACTION_KEYWORDS = [
  '未观察到',
  '未发现',
  '没有明确',
  '无明确',
  '仍以',
  '行业观察',
];

function isConcreteBrandAction(brand: string, action: string): boolean {
  const normalizedBrand = brand.trim();
  const normalizedAction = action.trim();

  if (!normalizedBrand || !normalizedAction) {
    return false;
  }

  const isGenericBrand = GENERIC_BRAND_KEYWORDS.some(keyword => normalizedBrand.includes(keyword));
  const isObservationOnly = NON_CASE_ACTION_KEYWORDS.some(keyword => normalizedAction.includes(keyword));

  return !isGenericBrand && !isObservationOnly;
}

function createBrandCaseTitle(brand: string, action: string): string {
  const cleanedAction = action
    .replace(/[。.!！?？].*$/, '')
    .replace(/^以\s*/, '以 ')
    .trim();
  const shortAction = cleanedAction.length > 34 ? `${cleanedAction.slice(0, 34)}...` : cleanedAction;

  return `${brand}：${shortAction}`;
}

function createReferencePoint(signal: Signal): string {
  return signal.sofieInsights.content ||
    signal.sofieInsights.operations ||
    signal.coreInsight ||
    signal.proposalLine ||
    '可结合该动作观察女性护理品牌在内容周期、用户沟通和产品场景上的延展机会。';
}

function uniqueItems(items: string[]): string[] {
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));
}

function parseLocalDate(value: string): Date | null {
  const match = value.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseDateRangeText(value: string): { start: Date; end: Date } | null {
  const matches = Array.from(value.matchAll(/(\d{4})[-/](\d{2})[-/](\d{2})/g));

  if (matches.length < 2) {
    return null;
  }

  const toDate = (match: RegExpMatchArray) =>
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return {
    start: toDate(matches[0]),
    end: toDate(matches[1]),
  };
}

function createWeekOption(start: string, end: string): WeekOption | null {
  if (!start || !end) {
    return null;
  }

  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);

  if (!startDate || !endDate) {
    return null;
  }

  return {
    start: formatInputDate(startDate),
    end: formatInputDate(endDate),
    label: `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`,
  };
}

function createWeekOptionFromPeriod(period: string): WeekOption | null {
  const periodRange = parseDateRangeText(period);

  if (!periodRange) {
    return null;
  }

  return createWeekOption(formatInputDate(periodRange.start), formatInputDate(periodRange.end));
}

function sortWeekOptions(options: WeekOption[]): WeekOption[] {
  return Array.from(
    new Map(options.map(option => [`${option.start}-${option.end}`, option])).values()
  ).sort((a, b) => {
    const aEnd = parseLocalDate(a.end)?.getTime() ?? 0;
    const bEnd = parseLocalDate(b.end)?.getTime() ?? 0;

    return bEnd - aEnd;
  });
}

function createWeekOptionsFromMarkdown(markdown: string): WeekOption[] {
  const reportBlocks = markdown
    .split(/(?=^# FemCare Signal Log\s*$)/gm)
    .filter(block => block.trim().length > 0);

  const options = reportBlocks.flatMap(block => {
    const period = block.match(/^检索窗口：\s*([^\n]+)/m)?.[1] ?? '';
    const option = createWeekOptionFromPeriod(period);

    return option ? [option] : [];
  });

  return sortWeekOptions(options);
}

function createWeekOptions(reports: { dateRange: DateRange }[], signals: Signal[]): WeekOption[] {
  const options = [
    ...reports.map(report => createWeekOption(report.dateRange.start, report.dateRange.end)),
    ...signals.map(signal => createWeekOptionFromPeriod(signal.period)),
  ].filter((option): option is WeekOption => Boolean(option));

  return sortWeekOptions(options);
}

function isSignalInWeekOption(signal: Signal, weekOption: WeekOption): boolean {
  const periodRange = parseDateRangeText(signal.period);

  if (periodRange) {
    return formatInputDate(periodRange.start) === weekOption.start &&
      formatInputDate(periodRange.end) === weekOption.end;
  }

  const signalDate = parseLocalDate(signal.signalDate);

  if (!signalDate) {
    return false;
  }

  const start = parseLocalDate(weekOption.start);
  const end = parseLocalDate(weekOption.end);

  return Boolean(start && end && isDateInRange(signalDate, start, end));
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();

  return time >= start.getTime() && time <= end.getTime();
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '', generated: '' });
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'empty' | 'parse-error' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchSignalMarkdown()
      .then(markdown => {
        if (cancelled) {
          return;
        }

        if (markdown.trim().length === 0) {
          setLoadStatus('empty');
          return;
        }

        const markdownWeekOptions = createWeekOptionsFromMarkdown(markdown);
        const parsed = parseSignalMarkdown(markdown);

        if (parsed.signals.length === 0) {
          setLoadError('Markdown读取成功，但未识别到Signal结构');
          setLoadStatus('parse-error');
          return;
        }

        const nextWeekOptions = sortWeekOptions([
          ...markdownWeekOptions,
          ...createWeekOptions(parsed.reports, parsed.signals),
        ]);

        setSignals(parsed.signals);
        setDateRange(parsed.dateRange);
        setWeekOptions(nextWeekOptions);
        setSelectedWeekIndex(0);
        setLoadStatus('ready');
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : '无法读取周报 Markdown';
        setLoadError(message);
        if (message === 'Markdown为空') {
          setLoadStatus('empty');
        } else if (message === 'Markdown读取成功，但未识别到Signal结构') {
          setLoadStatus('parse-error');
        } else {
          setLoadStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    return Array.from(new Set(signals.flatMap(signal => [
      ...signal.industrySignals,
      ...signal.tracking.topics,
      ...signal.tags
    ]))).filter(Boolean);
  }, [signals]);

  const selectedWeek = weekOptions[selectedWeekIndex] ??
    createWeekOption(dateRange.start, dateRange.end) ?? {
      start: '',
      end: '',
      label: '',
    };

  const weeklySignals = useMemo(() => {
    if (!selectedWeek.start || !selectedWeek.end) {
      return signals;
    }

    return signals.filter(signal => isSignalInWeekOption(signal, selectedWeek));
  }, [signals, selectedWeek]);

  const filteredSignals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return weeklySignals.filter(signal => {
      const searchableText = [
        signal.title,
        signal.summary,
        signal.whyItMatters,
        signal.coreInsight,
        signal.proposalLine,
        signal.strategicNote,
        ...signal.industrySignals,
        ...signal.tags,
        ...signal.tracking.brands,
        ...signal.tracking.topics,
        ...signal.tracking.kols,
        ...signal.tracking.userGroups,
        ...signal.tracking.platformPlays,
        ...signal.brandActions.flatMap(action => [action.brand, action.action]),
        signal.sofieInsights.content,
        signal.sofieInsights.operations,
        signal.sofieInsights.ugc,
        signal.sofieInsights.ip,
        signal.sofieInsights.risks,
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = normalizedQuery === ''
        ? true
        : searchableText.includes(normalizedQuery);

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag =>
          signal.industrySignals.includes(tag) ||
          signal.tracking.topics.includes(tag) ||
          signal.tags.includes(tag)
        );

      return matchesSearch && matchesTags;
    });
  }, [weeklySignals, searchQuery, selectedTags]);

  useEffect(() => {
    console.log('reports', weekOptions.map(option => `${option.start} 至 ${option.end}`));
    console.log('weekOptions', weekOptions);
    console.log('signals', signals.length);
    console.log('signals by period', signals.map(signal => ({
      title: signal.title,
      period: signal.period,
    })));
    console.log('selectedWeek', selectedWeek);
    console.log('signals by selectedWeek', filteredSignals.length);
    console.log('searchQuery', searchQuery);
  }, [weekOptions, signals, selectedWeek, filteredSignals.length, searchQuery]);

  const goToPreviousWeek = () => {
    setSelectedWeekIndex(index => Math.min(index + 1, Math.max(weekOptions.length - 1, 0)));
  };

  const goToNextWeek = () => {
    setSelectedWeekIndex(index => Math.max(index - 1, 0));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 border-b border-rose-100/50 sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-rose-500" />
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">FemCare Signal Log</h1>
                </div>
                <p className="text-sm text-slate-500 mt-1">女性护理行业趋势监测 Dashboard</p>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 border border-rose-100">
                <div className="text-[11px] text-slate-400 mb-1">周报周期</div>
                <div className="flex items-center gap-2 text-slate-500">
                  <button
                    type="button"
                    onClick={goToPreviousWeek}
                    className="px-2 py-1 rounded-md bg-white/70 border border-rose-100 text-xs font-medium hover:border-rose-300 hover:text-rose-500 transition-colors"
                  >
                    上一周
                  </button>
                  <div className="flex items-center gap-1.5 text-[17px] font-medium text-slate-500 whitespace-nowrap">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {selectedWeek.label}
                  </div>
                  <button
                    type="button"
                    onClick={goToNextWeek}
                    className="px-2 py-1 rounded-md bg-white/70 border border-rose-100 text-xs font-medium hover:border-rose-300 hover:text-rose-500 transition-colors"
                  >
                    下一周
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索趋势、洞察、品牌..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 outline-none text-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  showFilters || selectedTags.length > 0
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                筛选
                {selectedTags.length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                    {selectedTags.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tag Filters */}
            {showFilters && (
              <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">标签筛选</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-rose-500 hover:text-rose-600"
                    >
                      清除全部
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 sticky top-[140px] sm:top-[132px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[
              { key: 'timeline', label: '趋势时间轴', icon: Clock },
              { key: 'cases', label: '品牌案例库', icon: Building2 },
              { key: 'stats', label: '女性议题统计', icon: BarChart3 },
              { key: 'inspirations', label: '提案灵感池', icon: Lightbulb },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[2px] whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'text-rose-500 border-rose-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loadStatus === 'loading' && (
          <LoadStateCard title="正在读取周报 Markdown" description="正在加载 public/data/FemCare_SIGNAL_LOG.md" />
        )}
        {loadStatus === 'empty' && (
          <LoadStateCard title="Markdown为空" description="public/data/FemCare_SIGNAL_LOG.md 已读取，但没有可解析内容。" />
        )}
        {loadStatus === 'parse-error' && (
          <LoadStateCard title={loadError || 'Markdown读取成功，但未识别到Signal结构'} description="请检查 Signal 标题是否使用 ## Signal 1：标题 这样的结构。" />
        )}
        {loadStatus === 'error' && (
          <LoadStateCard title="无法读取周报 Markdown" description={loadError} />
        )}
        {loadStatus === 'ready' && weeklySignals.length === 0 && (
          <LoadStateCard title="本周暂无记录" description={selectedWeek.label} />
        )}
        {loadStatus === 'ready' && activeTab === 'timeline' && (
          <TimelineTab
            signals={filteredSignals}
            expandedSignal={expandedSignal}
            setExpandedSignal={setExpandedSignal}
          />
        )}
        {loadStatus === 'ready' && activeTab === 'cases' && <CasesTab signals={filteredSignals} />}
        {loadStatus === 'ready' && activeTab === 'stats' && <StatsTab signals={filteredSignals} />}
        {loadStatus === 'ready' && activeTab === 'inspirations' && <InspirationsTab signals={filteredSignals} />}
      </main>
    </div>
  );
}

function LoadStateCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-2">{description}</p>
    </div>
  );
}

function TimelineTab({
  signals,
  expandedSignal,
  setExpandedSignal
}: {
  signals: Signal[];
  expandedSignal: number | null;
  setExpandedSignal: (id: number | null) => void;
}) {
  return (
    <div className="space-y-4">
      {signals.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>未找到匹配的趋势信号</p>
        </div>
      ) : (
        signals.map((signal, index) => (
          <div
            key={signal.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-rose-200 transition-colors"
          >
            <button
              onClick={() => setExpandedSignal(expandedSignal === signal.id ? null : signal.id)}
              className="w-full text-left p-5 flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-600 font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-snug">
                    Signal {signal.id}: {signal.title}
                  </h3>
                  {expandedSignal === signal.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{signal.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.industrySignals.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {expandedSignal === signal.id && (
              <div className="px-5 pb-5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                <div className="pt-5 space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-500" />
                      为什么值得关注
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{signal.whyItMatters}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-500" />
                      核心洞察
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 rounded-lg p-3 border border-amber-100">
                      {signal.coreInsight}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      相关品牌动作
                    </h4>
                    <div className="space-y-2">
                      {signal.brandActions.map((action, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <span className="text-xs font-semibold text-blue-600">{action.brand}</span>
                          <p className="text-sm text-slate-600 mt-1">{action.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-500" />
                      对苏菲的启发
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {signal.sofieInsights.content && (
                        <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                          <span className="text-xs font-semibold text-rose-600">内容机会</span>
                          <p className="text-xs text-slate-600 mt-1">{signal.sofieInsights.content}</p>
                        </div>
                      )}
                      {signal.sofieInsights.operations && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <span className="text-xs font-semibold text-blue-600">运营机会</span>
                          <p className="text-xs text-slate-600 mt-1">{signal.sofieInsights.operations}</p>
                        </div>
                      )}
                      {signal.sofieInsights.ugc && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <span className="text-xs font-semibold text-green-600">UGC机会</span>
                          <p className="text-xs text-slate-600 mt-1">{signal.sofieInsights.ugc}</p>
                        </div>
                      )}
                      {signal.sofieInsights.ip && (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                          <span className="text-xs font-semibold text-purple-600">IP机会</span>
                          <p className="text-xs text-slate-600 mt-1">{signal.sofieInsights.ip}</p>
                        </div>
                      )}
                    </div>
                    {signal.sofieInsights.risks && (
                      <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-amber-700">风险提醒</span>
                          <p className="text-xs text-slate-600 mt-1">{signal.sofieInsights.risks}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-slate-50 to-rose-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">
                      <span className="text-rose-500">提案金句：</span>
                      {signal.proposalLine}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function CasesTab({ signals }: { signals: Signal[] }) {
  const brandCases = useMemo<BrandCase[]>(() => {
    return signals.flatMap(signal =>
      signal.brandActions
        .filter(action => isConcreteBrandAction(action.brand, action.action))
        .map(action => {
          const tags = uniqueItems([
            ...signal.tags,
            ...signal.tracking.topics,
            ...signal.industrySignals,
          ]).slice(0, 5);

          return {
            title: createBrandCaseTitle(action.brand, action.action),
            brand: action.brand,
            action: action.action,
            reference: createReferencePoint(signal),
            signalTitle: signal.title,
            signalId: signal.id,
            tags,
          };
        })
    );
  }, [signals]);

  const [caseFilter, setCaseFilter] = useState('');

  const filteredBrands = brandCases.filter(item => {
    const normalizedCaseFilter = caseFilter.trim().toLowerCase();

    if (normalizedCaseFilter === '') {
      return true;
    }

    return [item.brand, item.title, item.action, item.reference, item.signalTitle, ...item.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedCaseFilter);
  });

  const uniqueBrands = uniqueItems(brandCases.map(c => c.brand));

  useEffect(() => {
    console.log('brands', brandCases.length);
    console.log('filteredBrands', filteredBrands.length);
  }, [brandCases.length, filteredBrands.length]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCaseFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            caseFilter === ''
              ? 'bg-rose-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部品牌
        </button>
        {uniqueBrands.map(brand => (
          <button
            key={brand}
            onClick={() => setCaseFilter(brand)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              caseFilter === brand
                ? 'bg-rose-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {brand}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBrands.map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-rose-200 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-slate-800 leading-snug">{c.title}</h3>
              <span className="text-xs text-slate-400">Signal {c.signalId}</span>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-blue-600">相关品牌</span>
                <p className="text-sm text-slate-600 mt-1">{c.brand}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500">所属 Signal</span>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.signalTitle}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-rose-600">品牌动作</span>
                <p className="text-sm text-slate-700 leading-relaxed mt-1">{c.action}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <span className="text-xs font-semibold text-amber-700">可借鉴点</span>
                <p className="text-sm text-slate-700 leading-relaxed mt-1">{c.reference}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.tags.map(topic => (
                <span
                  key={topic}
                  className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ signals }: { signals: Signal[] }) {
  const stats = useMemo(() => {
    const allTopics = signals.flatMap(s => s.tracking.topics);
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allKols = signals.flatMap(s => s.tracking.kols);
    const kolCounts = allKols.reduce((acc, kol) => {
      acc[kol] = (acc[kol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allUserGroups = signals.flatMap(s => s.tracking.userGroups);
    const userGroupCounts = allUserGroups.reduce((acc, group) => {
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      topicCounts: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]),
      kolCounts: Object.entries(kolCounts).sort((a, b) => b[1] - a[1]),
      userGroupCounts: Object.entries(userGroupCounts).sort((a, b) => b[1] - a[1]),
      totalSignals: signals.length,
      totalBrands: new Set(signals.flatMap(s => s.tracking.brands)).size
    };
  }, [signals]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-rose-500">{stats.totalSignals}</div>
          <div className="text-xs text-slate-500 mt-1">趋势信号</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-500">{stats.totalBrands}</div>
          <div className="text-xs text-slate-500 mt-1">相关品牌</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-amber-500">{stats.topicCounts.length}</div>
          <div className="text-xs text-slate-500 mt-1">追踪话题</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-500">{stats.userGroupCounts.length}</div>
          <div className="text-xs text-slate-500 mt-1">用户圈层</div>
        </div>
      </div>

      {/* Topic Cloud */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-rose-500" />
          热门议题词云
        </h3>
        <div className="flex flex-wrap gap-2">
          {stats.topicCounts.map(([topic, count]) => (
            <span
              key={topic}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-transform hover:scale-105"
              style={{
                backgroundColor: `rgba(244, 63, 94, ${0.1 + (count / 4) * 0.2})`,
                color: `rgb(${Math.floor(120 + (count / 4) * 60)}, ${Math.floor(30 + (count / 4) * 20)}, ${Math.floor(50 + (count / 4) * 20)})`,
                fontSize: `${0.75 + (count / 4) * 0.25}rem`
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* KOLs and User Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            关键KOL类型
          </h3>
          <div className="space-y-2">
            {stats.kolCounts.slice(0, 8).map(([kol, count]) => (
              <div key={kol} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{kol}</span>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${(count / 4) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-500" />
            用户圈层分布
          </h3>
          <div className="space-y-2">
            {stats.userGroupCounts.slice(0, 8).map(([group, count]) => (
              <div key={group} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{group}</span>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${(count / 4) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InspirationsTab({ signals }: { signals: Signal[] }) {
  const proposalIdeas = useMemo<ProposalIdea[]>(() => {
    return signals.flatMap(signal => {
      const base = {
        sourceSignal: signal.title,
        signalNumber: signal.id,
        tags: signal.tags,
        category: signal.category,
      };

      const candidates: Array<Omit<ProposalIdea, 'content'> & { content?: string }> = [
        {
          ...base,
          type: '内容机会' as const,
          content: signal.sofieInsights.content,
          color: 'rose' as const,
        },
        {
          ...base,
          type: '运营机会' as const,
          content: signal.sofieInsights.operations,
          color: 'blue' as const,
        },
        {
          ...base,
          type: 'UGC机会' as const,
          content: signal.sofieInsights.ugc,
          color: 'green' as const,
        },
        {
          ...base,
          type: 'IP机会' as const,
          content: signal.sofieInsights.ip,
          color: 'purple' as const,
        },
        {
          ...base,
          type: '风险提醒' as const,
          content: signal.sofieInsights.risks,
          color: 'amber' as const,
        },
        {
          ...base,
          type: '提案金句' as const,
          content: signal.proposalLine,
          color: 'slate' as const,
        },
      ];

      return candidates.flatMap(item => {
        const content = item.content?.trim();

        return content ? [{ ...item, content }] : [];
      });
    });
  }, [signals]);

  const [typeFilter, setTypeFilter] = useState<string>('全部灵感');

  const filteredIdeas = proposalIdeas.filter(item => {
    if (typeFilter === '全部灵感') {
      return true;
    }

    return item.type === typeFilter;
  });

  useEffect(() => {
    console.log('proposal ideas', proposalIdeas.length);
    console.log('proposal idea types', proposalIdeas.map(i => i.type));
    console.log('ideas', proposalIdeas.length);
    console.log('filteredIdeas', filteredIdeas.length);
  }, [proposalIdeas, filteredIdeas.length]);

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: '全部灵感', label: '全部灵感' },
          { key: '内容机会', label: '内容机会', color: 'rose' },
          { key: '运营机会', label: '运营机会', color: 'blue' },
          { key: 'UGC机会', label: 'UGC机会', color: 'green' },
          { key: 'IP机会', label: 'IP机会', color: 'purple' },
          { key: '风险提醒', label: '风险提醒', color: 'amber' },
          { key: '提案金句', label: '提案金句', color: 'slate' }
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setTypeFilter(filter.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === filter.key
                ? `bg-${filter.color || 'rose'}-500 text-white`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={typeFilter === filter.key && filter.color ? {
              backgroundColor: filter.color === 'rose' ? '#f43f5e' :
                              filter.color === 'blue' ? '#3b82f6' :
                              filter.color === 'green' ? '#22c55e' :
                              filter.color === 'purple' ? '#a855f7' :
                              filter.color === 'amber' ? '#f59e0b' :
                              filter.color === 'slate' ? '#475569' : undefined
            } : {}}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIdeas.map((item, i) => {
          const colors = colorClasses[item.color];
          return (
            <div
              key={i}
              className={`${colors.bg} ${colors.border} border rounded-xl p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-xs font-semibold ${colors.text} px-2 py-0.5 rounded-full bg-white/50`}>
                  {item.type}
                </span>
                <span className="text-xs text-slate-400">Signal {item.signalNumber}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{item.content}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...item.tags, ...item.category].slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white/60 text-slate-500 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                来源：{item.sourceSignal}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
