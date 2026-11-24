import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  LayoutDashboard,
  CalendarCheck2,
  FileSpreadsheet,
  Award,
  CalendarDays,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarRange,
  Sparkles,
  Send,
  Database,
  ShieldCheck,
  X,
  CornerDownLeft,
  PanelLeft,
} from 'lucide-react';
import { NavTab } from './Sidebar.tsx';
import { Student } from '../types/index.ts';

interface DesktopCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onToggleSidebar: () => void;
  students: Student[];
}

interface CommandItem {
  id: string;
  label: string;
  sublabel: string;
  shortcut?: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string;
}

export const DesktopCommandPalette: React.FC<DesktopCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onToggleSidebar,
  students,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'tab-dashboard',
        label: 'ផ្ទាំងគ្រប់គ្រង (Dashboard)',
        sublabel: 'ទិដ្ឋភាពទូទៅ និងស្ថិតិប្រចាំថ្ងៃ',
        shortcut: 'Alt+1',
        icon: LayoutDashboard,
        action: () => onSelectTab('dashboard'),
        keywords: 'dashboard home overview ផ្ទាំងគ្រប់គ្រង ដើម',
      },
      {
        id: 'tab-attendance',
        label: 'កត់ត្រាវត្តមានសិស្ស (Daily Attendance)',
        sublabel: 'កត់ត្រាវត្តមាន ៥ កម្រិត និងស្កេន QR',
        shortcut: 'Alt+2',
        icon: CalendarCheck2,
        action: () => onSelectTab('attendance'),
        keywords: 'attendance qr វត្តមាន អវត្តមាន',
      },
      {
        id: 'tab-reports',
        label: 'របាយការណ៍វត្តមាន (Attendance Reports)',
        sublabel: 'របាយការណ៍ប្រចាំខែ បោះពុម្ព A4 & Excel',
        shortcut: 'Alt+3',
        icon: FileSpreadsheet,
        action: () => onSelectTab('attendance_reports'),
        keywords: 'reports excel print របាយការណ៍ បោះពុម្ព',
      },
      {
        id: 'tab-grades',
        label: 'ពិន្ទុ និងការប្រឡង (Grades & Exams)',
        sublabel: 'បញ្ចូលពិន្ទុ ចំណាត់ថ្នាក់ និងប័ណ្ណសរសើរ',
        shortcut: 'Alt+4',
        icon: Award,
        action: () => onSelectTab('grades'),
        keywords: 'grades exam score rank ពិន្ទុ ប្រឡង ចំណាត់ថ្នាក់',
      },
      {
        id: 'tab-timetable',
        label: 'កាលវិភាគសិក្សា (Weekly Timetable)',
        sublabel: 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍',
        shortcut: 'Alt+5',
        icon: CalendarDays,
        action: () => onSelectTab('timetable'),
        keywords: 'timetable schedule កាលវិភាគ',
      },
      {
        id: 'tab-students',
        label: 'គ្រប់គ្រងសិស្ស (Student Directory)',
        sublabel: `បញ្ជីឈ្មោះសិស្សសរុប (${students.length} នាក់) · កាតសិស្ស · វិញ្ញាបនបត្រ`,
        shortcut: 'Alt+6',
        icon: Users,
        action: () => onSelectTab('students'),
        keywords: 'students directory id card សិស្ស កាត',
      },
      {
        id: 'tab-teachers',
        label: 'គ្រប់គ្រងគ្រូបង្រៀន (Teachers)',
        sublabel: 'បញ្ជីគ្រូបង្រៀន និងបុគ្គលិកសិក្សា',
        shortcut: 'Alt+7',
        icon: GraduationCap,
        action: () => onSelectTab('teachers'),
        keywords: 'teachers staff គ្រូបង្រៀន',
      },
      {
        id: 'tab-classes',
        label: 'ថ្នាក់ និងបន្ទប់រៀន (Classes)',
        sublabel: 'គ្រប់គ្រងថ្នាក់ទី ៧ ដល់ទី ១២',
        shortcut: 'Alt+8',
        icon: School,
        action: () => onSelectTab('classes'),
        keywords: 'classes room ថ្នាក់រៀន បន្ទប់',
      },
      {
        id: 'tab-subjects',
        label: 'មុខវិជ្ជាសិក្សា (Subjects)',
        sublabel: 'កម្មវិធីសិក្សា និងម៉ោងបង្រៀន',
        icon: BookOpen,
        action: () => onSelectTab('subjects'),
        keywords: 'subjects curriculum មុខវិជ្ជា',
      },
      {
        id: 'tab-academic-year',
        label: 'ឆ្នាំសិក្សា (Academic Years)',
        sublabel: 'គ្រប់គ្រងឆ្នាំសិក្សា និងឆមាស',
        icon: CalendarRange,
        action: () => onSelectTab('academic_year'),
        keywords: 'academic year term ឆ្នាំសិក្សា',
      },
      {
        id: 'tab-behavior',
        label: 'វិន័យ & លើកទឹកចិត្ត (Behavior)',
        sublabel: 'កំណត់ត្រាមារយាទ និងការសរសើរសិស្ស',
        icon: Sparkles,
        action: () => onSelectTab('behavior'),
        keywords: 'behavior discipline merits វិន័យ មារយាទ',
      },
      {
        id: 'tab-telegram',
        label: 'Telegram Bot & ជូនដំណឹង (@stschoolsystem_bot)',
        sublabel: 'កំណត់ Telegram Bot ផ្ញើសារសាកល្បង និងប្រវត្តិជូនដំណឹង',
        shortcut: 'Alt+T',
        icon: Send,
        action: () => onSelectTab('telegram'),
        keywords: 'telegram bot alert notification ជូនដំណឹង សារ',
      },
      {
        id: 'tab-security',
        label: 'Database & សុវត្ថិភាព (Backup)',
        sublabel: 'បម្រុងទុកទិន្នន័យ និងកំណត់ហេតុប្រព័ន្ធ',
        icon: Database,
        action: () => onSelectTab('security_db'),
        keywords: 'database backup security audit ទិន្នន័យ',
      },
      {
        id: 'tab-users',
        label: 'គ្រប់គ្រង Admin & Users',
        sublabel: 'គណនីប្រើប្រាស់ និងលេខកូដសម្ងាត់រួម',
        icon: ShieldCheck,
        action: () => onSelectTab('users'),
        keywords: 'users admin password អ្នកប្រើប្រាស់',
      },
      {
        id: 'action-sidebar',
        label: 'បង្រួម ឬពង្រីកម៉ឺនុយចំហៀង (Toggle Sidebar)',
        sublabel: 'ពង្រីកផ្ទៃការងារលើអេក្រង់កុំព្យូទ័រឱ្យកាន់តែទូលាយ',
        shortcut: 'Alt+B',
        icon: PanelLeft,
        action: onToggleSidebar,
        keywords: 'sidebar collapse expand desktop ម៉ឺនុយ ពង្រីក',
      },
    ],
    [onSelectTab, onToggleSidebar, students.length]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.sublabel.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 pt-16 sm:pt-24 px-4 font-khmer no-print"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-amber-300/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
          <Search className="w-4 h-4 text-blue-900 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកម៉ឺនុយ ឬមុខងារលើកុំព្យូទ័រ... (ឧ. វត្តមាន, ពិន្ទុ, Telegram)"
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            aria-label="បិទ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-1.5">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950 text-white'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-blue-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.shortcut && (
                    <kbd
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                        isSelected
                          ? 'bg-slate-800 text-amber-300 border border-slate-700'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                  {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-amber-300" />}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              មិនមានមុខងារដែលត្រូវនឹង «{query}» ទេ
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <span>ប្រើ ↑ ↓ ដើម្បីជ្រើស · Enter ដើម្បីបើក</span>
          <span>ESC ដើម្បីបិទ</span>
        </div>
      </div>
    </div>
  );
};
