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

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '', generated: '' });
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

        const parsed = parseSignalMarkdown(markdown);

        if (parsed.signals.length === 0) {
          setLoadStatus('parse-error');
          return;
        }

        setSignals(parsed.signals);
        setDateRange(parsed.dateRange);
        setLoadStatus('ready');
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : '无法读取周报 Markdown';
        setLoadError(message);
        setLoadStatus(message === 'Markdown为空' ? 'empty' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    return Array.from(new Set(signals.flatMap(signal => [
      ...signal.industrySignals,
      ...signal.tracking.topics
    ]))).filter(Boolean);
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter(signal => {
      const matchesSearch = searchQuery === '' ||
        signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.coreInsight.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag =>
          signal.industrySignals.includes(tag) ||
          signal.tracking.topics.includes(tag)
        );

      return matchesSearch && matchesTags;
    });
  }, [searchQuery, selectedTags]);

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
              <div className="text-xs text-slate-400 bg-white/60 rounded-lg px-3 py-2 border border-rose-100">
                <Clock className="w-3 h-3 inline mr-1" />
                {dateRange.start} ~ {dateRange.end}
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
          <LoadStateCard title="Markdown读取成功，但解析失败" description="请检查 Signal 标题是否使用 ## Signal 1 这样的结构。" />
        )}
        {loadStatus === 'error' && (
          <LoadStateCard title="无法读取周报 Markdown" description={loadError} />
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
  const allCases = signals.flatMap(signal =>
    signal.brandActions.map(action => ({
      ...action,
      signalTitle: signal.title,
      signalId: signal.id,
      topics: signal.tracking.topics
    }))
  );

  const [caseFilter, setCaseFilter] = useState('');

  const filteredCases = allCases.filter(c =>
    caseFilter === '' || c.brand.includes(caseFilter) || c.action.includes(caseFilter)
  );

  const uniqueBrands = [...new Set(allCases.map(c => c.brand))];

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
        {filteredCases.map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-rose-200 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-sm font-semibold text-blue-600">{c.brand}</span>
              <span className="text-xs text-slate-400">Signal {c.signalId}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{c.action}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.topics.slice(0, 3).map(topic => (
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
  const inspirations = useMemo(() => {
    return signals.flatMap(signal => [
      {
        type: 'content',
        signalId: signal.id,
        signalTitle: signal.title,
        content: signal.sofieInsights.content,
        label: '内容机会',
        color: 'rose'
      },
      {
        type: 'operations',
        signalId: signal.id,
        signalTitle: signal.title,
        content: signal.sofieInsights.operations,
        label: '运营机会',
        color: 'blue'
      },
      {
        type: 'ugc',
        signalId: signal.id,
        signalTitle: signal.title,
        content: signal.sofieInsights.ugc,
        label: 'UGC机会',
        color: 'green'
      },
      {
        type: 'ip',
        signalId: signal.id,
        signalTitle: signal.title,
        content: signal.sofieInsights.ip,
        label: 'IP机会',
        color: 'purple'
      }
    ].filter(item => item.content));
  }, [signals]);

  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredInspirations = inspirations.filter(
    item => typeFilter === 'all' || item.type === typeFilter
  );

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部灵感' },
          { key: 'content', label: '内容机会', color: 'rose' },
          { key: 'operations', label: '运营机会', color: 'blue' },
          { key: 'ugc', label: 'UGC机会', color: 'green' },
          { key: 'ip', label: 'IP机会', color: 'purple' }
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
                              filter.color === 'purple' ? '#a855f7' : undefined
            } : {}}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInspirations.map((item, i) => {
          const colors = colorClasses[item.color];
          return (
            <div
              key={i}
              className={`${colors.bg} ${colors.border} border rounded-xl p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-xs font-semibold ${colors.text} px-2 py-0.5 rounded-full bg-white/50`}>
                  {item.label}
                </span>
                <span className="text-xs text-slate-400">Signal {item.signalId}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{item.content}</p>
              <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                来源：{item.signalTitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Proposal Lines */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          提案金句库
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map(signal => (
            <div
              key={signal.id}
              className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl border border-rose-100 p-4"
            >
              <p className="text-sm font-medium text-slate-700">{signal.proposalLine}</p>
              <span className="text-xs text-slate-400 mt-2 inline-block">Signal {signal.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
