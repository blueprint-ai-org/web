// Intelligent Search — Teacher Dashboard
//
// Features:
// - Natural language recognition ("students with high anxiety", "sleep issues", "Emily")
// - Quick-access tags for common queries
// - Instant results as you type
// - Recent searches
// - Smart categorization of results
// - Keyboard navigation (↑↓ to navigate, Enter to select, Esc to close)

import { useState, useEffect, useRef, useMemo } from 'react';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface Student {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  riskScore: number;
  status: 'elevated' | 'moderate' | 'monitor' | 'stable';
  metrics: {
    mood: number;
    anxiety: number;
    sleep: number;
    engagement: number;
    support: number;
    stress: number;
  };
  flags: string[];
  trend: 'improving' | 'stable' | 'declining';
}

interface QuickTag {
  id: string;
  label: string;
  icon: string;
  query: string;
  color: string;
  count?: number;
}

interface SearchResult {
  type: 'student' | 'insight' | 'metric' | 'action';
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  avatar?: string;
  status?: string;
  statusColor?: string;
  action?: string;
}

// ═══════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════

const students: Student[] = [
  { id: '1', name: 'Emily Martinez', grade: '10th', avatar: 'EM', riskScore: 78, status: 'elevated', metrics: { mood: 45, anxiety: 82, sleep: 5.8, engagement: 35, support: 72, stress: 78 }, flags: ['high-anxiety', 'sleep-deficit', 'declining-engagement'], trend: 'declining' },
  { id: '2', name: 'Josten Thompson', grade: '11th', avatar: 'JT', riskScore: 62, status: 'moderate', metrics: { mood: 58, anxiety: 65, sleep: 6.2, engagement: 55, support: 68, stress: 62 }, flags: ['moderate-anxiety', 'sleep-deficit'], trend: 'declining' },
  { id: '3', name: 'Wi Evans', grade: '9th', avatar: 'WE', riskScore: 56, status: 'moderate', metrics: { mood: 62, anxiety: 58, sleep: 6.8, engagement: 60, support: 75, stress: 55 }, flags: ['moderate-stress'], trend: 'stable' },
  { id: '4', name: 'Dani Garcia', grade: '12th', avatar: 'DG', riskScore: 71, status: 'elevated', metrics: { mood: 48, anxiety: 75, sleep: 5.5, engagement: 42, support: 65, stress: 72 }, flags: ['high-anxiety', 'sleep-deficit', 'low-engagement'], trend: 'declining' },
  { id: '5', name: 'Marcus Chen', grade: '10th', avatar: 'MC', riskScore: 28, status: 'monitor', metrics: { mood: 72, anxiety: 35, sleep: 7.2, engagement: 78, support: 82, stress: 32 }, flags: [], trend: 'improving' },
  { id: '6', name: 'Sarah Kim', grade: '11th', avatar: 'SK', riskScore: 45, status: 'moderate', metrics: { mood: 65, anxiety: 52, sleep: 6.5, engagement: 70, support: 78, stress: 48 }, flags: ['moderate-anxiety'], trend: 'stable' },
  { id: '7', name: 'Alex Rivera', grade: '9th', avatar: 'AR', riskScore: 82, status: 'elevated', metrics: { mood: 38, anxiety: 88, sleep: 5.2, engagement: 28, support: 55, stress: 85 }, flags: ['high-anxiety', 'severe-sleep-deficit', 'low-engagement', 'high-stress'], trend: 'declining' },
  { id: '8', name: 'Jordan Lee', grade: '12th', avatar: 'JL', riskScore: 22, status: 'stable', metrics: { mood: 78, anxiety: 28, sleep: 7.8, engagement: 85, support: 88, stress: 25 }, flags: [], trend: 'improving' },
];

const quickTags: QuickTag[] = [
  { id: '1', label: 'High Anxiety', icon: '😰', query: 'high anxiety', color: '#FF453A', count: 3 },
  { id: '2', label: 'Sleep Deficit', icon: '😴', query: 'sleep deficit', color: '#FF9F0A', count: 4 },
  { id: '3', label: 'Declining', icon: '📉', query: 'declining trend', color: '#FF6B6B', count: 4 },
  { id: '4', label: 'Needs Escalation', icon: '🚨', query: 'elevated status', color: '#FF453A', count: 3 },
  { id: '5', label: 'Low Engagement', icon: '📊', query: 'low engagement', color: '#FF9F0A', count: 3 },
  { id: '6', label: 'High Stress', icon: '😫', query: 'high stress', color: '#FF6B6B', count: 2 },
  { id: '7', label: 'Improving', icon: '📈', query: 'improving trend', color: '#30D158', count: 2 },
  { id: '8', label: 'Strong Support', icon: '💚', query: 'high support', color: '#30D158', count: 3 },
];

const recentSearches = [
  'Emily Martinez',
  'students with sleep issues',
  'high anxiety 10th grade',
];

// ═══════════════════════════════════════════
// SEARCH LOGIC
// ═══════════════════════════════════════════

function parseQuery(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  let results: SearchResult[] = [];

  // Direct name search
  const nameMatches = students.filter(s =>
    s.name.toLowerCase().includes(q)
  );

  // Anxiety queries
  if (q.includes('anxiety') || q.includes('anxious') || q.includes('worried')) {
    const level = q.includes('high') || q.includes('severe') ? 70 : q.includes('moderate') ? 50 : 40;
    const anxietyStudents = students.filter(s => s.metrics.anxiety >= level);
    results.push(...anxietyStudents.map(s => studentToResult(s, `Anxiety: ${s.metrics.anxiety}%`)));
  }

  // Sleep queries
  else if (q.includes('sleep') || q.includes('tired') || q.includes('exhausted')) {
    const sleepStudents = students.filter(s => s.metrics.sleep < 7);
    results.push(...sleepStudents.map(s => studentToResult(s, `Sleep: ${s.metrics.sleep}h avg`)));
  }

  // Stress queries
  else if (q.includes('stress') || q.includes('overwhelm')) {
    const level = q.includes('high') ? 70 : 50;
    const stressStudents = students.filter(s => s.metrics.stress >= level);
    results.push(...stressStudents.map(s => studentToResult(s, `Stress: ${s.metrics.stress}%`)));
  }

  // Engagement queries
  else if (q.includes('engagement') || q.includes('participation') || q.includes('disengaged')) {
    const engagementStudents = students.filter(s => s.metrics.engagement < 50);
    results.push(...engagementStudents.map(s => studentToResult(s, `Engagement: ${s.metrics.engagement}%`)));
  }

  // Status queries
  else if (q.includes('elevated') || q.includes('escalat') || q.includes('urgent') || q.includes('critical')) {
    const elevatedStudents = students.filter(s => s.status === 'elevated');
    results.push(...elevatedStudents.map(s => studentToResult(s, `Risk Score: ${s.riskScore}`)));
  }

  // Trend queries
  else if (q.includes('declining') || q.includes('getting worse') || q.includes('dropping')) {
    const decliningStudents = students.filter(s => s.trend === 'declining');
    results.push(...decliningStudents.map(s => studentToResult(s, `Trend: Declining`)));
  }
  else if (q.includes('improving') || q.includes('getting better') || q.includes('progress')) {
    const improvingStudents = students.filter(s => s.trend === 'improving');
    results.push(...improvingStudents.map(s => studentToResult(s, `Trend: Improving`)));
  }

  // Grade queries
  else if (q.match(/(\d+)(th|st|nd|rd)?\s*(grade)?/)) {
    const gradeMatch = q.match(/(\d+)/);
    if (gradeMatch) {
      const grade = `${gradeMatch[1]}th`;
      const gradeStudents = students.filter(s => s.grade.toLowerCase() === grade);
      results.push(...gradeStudents.map(s => studentToResult(s)));
    }
  }

  // Support queries
  else if (q.includes('support') || q.includes('isolated') || q.includes('lonely')) {
    const lowSupport = q.includes('low') || q.includes('isolated') || q.includes('lonely');
    const supportStudents = students.filter(s => lowSupport ? s.metrics.support < 60 : s.metrics.support >= 80);
    results.push(...supportStudents.map(s => studentToResult(s, `Support Index: ${s.metrics.support}%`)));
  }

  // Mood queries
  else if (q.includes('mood') || q.includes('sad') || q.includes('depressed') || q.includes('unhappy')) {
    const moodStudents = students.filter(s => s.metrics.mood < 50);
    results.push(...moodStudents.map(s => studentToResult(s, `Mood: ${s.metrics.mood}%`)));
  }

  // Name matches take priority
  if (nameMatches.length > 0) {
    results = nameMatches.map(s => studentToResult(s));
  }

  // Generic search fallback - search all fields
  if (results.length === 0) {
    const genericMatches = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      s.flags.some(f => f.toLowerCase().includes(q)) ||
      s.status.toLowerCase().includes(q)
    );
    results.push(...genericMatches.map(s => studentToResult(s)));
  }

  // Remove duplicates
  const seen = new Set();
  results = results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return results;
}

function studentToResult(student: Student, subtitle?: string): SearchResult {
  const statusColors: Record<string, string> = {
    elevated: '#FF453A',
    moderate: '#FF9F0A',
    monitor: '#FFD60A',
    stable: '#30D158',
  };

  return {
    type: 'student',
    id: student.id,
    title: student.name,
    subtitle: subtitle || `${student.grade} · Risk Score: ${student.riskScore}`,
    avatar: student.avatar,
    status: student.status,
    statusColor: statusColors[student.status],
  };
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function IntelligentSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showRecent, setShowRecent] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => parseQuery(query), [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        }
        if (e.key === 'Enter' && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelectResult = (result: SearchResult) => {
    console.log('Selected:', result);
    // Navigate to student profile or show detail
    setIsOpen(false);
    setQuery('');
  };

  const handleTagClick = (tag: QuickTag) => {
    setQuery(tag.query);
    setShowRecent(false);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl bg-white/10 border border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/15 hover:border-white/20"
      >
        <SearchIcon />
        <span className="text-sm text-white/50">Search students, metrics...</span>
        <kbd className="text-[11px] py-0.5 px-1.5 rounded bg-white/10 text-white/40 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-start justify-center pt-[12vh]"
          onClick={() => { setIsOpen(false); setQuery(''); }}
        >
          {/* Search Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[640px] bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl overflow-hidden font-sans"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 py-4 px-5 border-b border-white/[0.08]">
              <SearchIcon color="rgba(255,255,255,0.4)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowRecent(false); }}
                placeholder="Search students, conditions, metrics..."
                className="flex-1 bg-transparent border-none outline-none text-[17px] text-white font-normal placeholder:text-white/40"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setShowRecent(true); }}
                  className="w-6 h-6 rounded-full bg-white/10 border-none cursor-pointer flex items-center justify-center text-white/50 text-sm hover:bg-white/20"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Tags */}
            {!query && (
              <div className="py-4 px-5 border-b border-white/[0.08]">
                <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Quick Filters
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag)}
                      className="flex items-center gap-1.5 py-2 px-3 rounded-full border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: `${tag.color}15`,
                        borderColor: `${tag.color}30`,
                      }}
                    >
                      <span className="text-sm">{tag.icon}</span>
                      <span className="text-[13px] font-medium" style={{ color: tag.color }}>{tag.label}</span>
                      {tag.count && (
                        <span
                          className="text-[11px] py-0.5 px-1.5 rounded-full font-semibold"
                          style={{
                            background: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!query && showRecent && recentSearches.length > 0 && (
              <div className="py-4 px-5 border-b border-white/[0.08]">
                <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Recent Searches
                </div>
                <div className="flex flex-col gap-1">
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(search)}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-transparent border-none cursor-pointer text-left transition-colors duration-150 hover:bg-white/5"
                    >
                      <ClockIcon />
                      <span className="text-sm text-white/70">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {query && results.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="py-3 px-5">
                  <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                    {results.length} student{results.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div className="px-2 pb-3">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className="flex items-center gap-3.5 w-full py-3 px-3 rounded-xl border-none cursor-pointer text-left transition-colors duration-150"
                      style={{
                        background: index === selectedIndex ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0"
                        style={{
                          background: `${result.statusColor}20`,
                          color: result.statusColor,
                        }}
                      >
                        {result.avatar}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium text-white mb-0.5">
                          {result.title}
                        </div>
                        <div className="text-[13px] text-white/50">
                          {result.subtitle}
                        </div>
                      </div>

                      {/* Status badge */}
                      {result.status && (
                        <span
                          className="text-[11px] font-semibold py-1.5 px-2.5 rounded-lg uppercase tracking-wide flex-shrink-0"
                          style={{
                            background: `${result.statusColor}20`,
                            color: result.statusColor,
                          }}
                        >
                          {result.status}
                        </span>
                      )}

                      {/* Arrow */}
                      <ChevronRightIcon />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query && results.length === 0 && (
              <div className="py-10 px-5 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-[15px] text-white/60 mb-2">
                  No students found for "{query}"
                </div>
                <div className="text-[13px] text-white/40">
                  Try searching by name, condition, or metric
                </div>
              </div>
            )}

            {/* Footer hints */}
            <div className="flex items-center justify-between py-3 px-5 border-t border-white/[0.08] bg-black/20">
              <div className="flex gap-4">
                <span className="text-xs text-white/35 flex items-center gap-1.5">
                  <kbd className="py-0.5 px-1.5 rounded bg-white/10 text-[10px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="text-xs text-white/35 flex items-center gap-1.5">
                  <kbd className="py-0.5 px-1.5 rounded bg-white/10 text-[10px]">↵</kbd>
                  Select
                </span>
                <span className="text-xs text-white/35 flex items-center gap-1.5">
                  <kbd className="py-0.5 px-1.5 rounded bg-white/10 text-[10px]">esc</kbd>
                  Close
                </span>
              </div>
              <span className="text-xs text-white/35">
                Powered by Blueprint AI
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════

function SearchIcon({ color = 'rgba(255,255,255,0.5)' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.75 15.75L12.4875 12.4875" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <path d="M8 4.5V8L10.5 9.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10 8L6 12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
