'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  GitBranch,
  Keyboard,
  Minus,
  Moon,
  Play,
  Plus,
  Save,
  Square,
  Sun,
  Trash2,
  WandSparkles,
} from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';

import { LANGUAGE_CONFIGS, type LanguageKey } from '../utils/languageConfigs';
import { type BackendStatus, type ExecutionStatus } from '../utils/types';

const SHORTCUTS = [
  { action: 'run', label: 'Run code', keys: ['Ctrl/Cmd', 'Enter'] },
  { action: 'save', label: 'Save file', keys: ['Ctrl/Cmd', 'S'] },
  { action: 'format', label: 'Format code', keys: ['Ctrl/Cmd', 'Shift', 'F'] },
  { action: 'comment', label: 'Toggle comment', keys: ['Ctrl/Cmd', '/'] },
  { action: 'find', label: 'Find and replace', keys: ['Ctrl/Cmd', 'H'] },
];

interface NavbarProps {
  language: LanguageKey;
  availableLanguages: LanguageKey[];
  onLanguageChange: (lang: LanguageKey) => void;
  onRun: () => void | Promise<void>;
  onClear: () => void;
  onFormat: () => void;
  onDownload: () => void;
  onSaveToGitHub: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  isRunning: boolean;
  onCancelRun: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  executionStatus: ExecutionStatus;
  backendStatus: BackendStatus;
  runnerLabel: string;
}

export default function Navbar({
  language,
  availableLanguages,
  onLanguageChange,
  onRun,
  onClear,
  onFormat,
  onDownload,
  onSaveToGitHub,
  onToggleTheme,
  theme,
  isRunning,
  onCancelRun,
  fontSize,
  onFontSizeChange,
  executionStatus,
  backendStatus,
  runnerLabel,
}: NavbarProps) {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGE_CONFIGS[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }

      if (saveDropdownRef.current && !saveDropdownRef.current.contains(event.target as Node)) {
        setSaveDropdownOpen(false);
      }

      if (shortcutsRef.current && !shortcutsRef.current.contains(event.target as Node)) {
        setShortcutsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusDotColor: Record<ExecutionStatus, string> = {
    idle: 'bg-muted-foreground',
    running: 'bg-accent',
    success: 'bg-success',
    compile_error: 'bg-error',
    runtime_error: 'bg-error',
    tle: 'bg-warning',
  };

  const backendBadgeClassName =
    backendStatus === 'ready'
      ? 'status-badge-success'
      : backendStatus === 'checking'
        ? 'status-badge-warning'
        : 'status-badge-error';

  return (
    <nav
      className="navbar-bg flex items-center justify-between border-b border-border px-4"
      style={{ height: '56px', minHeight: '56px' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <div className="leading-none">
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--primary)', letterSpacing: '-0.02em' }}
            >
              Forge
            </span>{' '}
            <span className="text-lg font-semibold tracking-tight">Compiler</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 flex-shrink-0 rounded-full ${statusDotColor[executionStatus]} ${
              isRunning ? 'animate-pulse' : ''
            }`}
          />
          <span className="hidden text-xs text-muted-foreground sm:block">
            {executionStatus === 'idle' && 'Ready'}
            {executionStatus === 'running' && 'Running'}
            {executionStatus === 'success' && 'Accepted'}
            {executionStatus === 'compile_error' && 'Compile error'}
            {executionStatus === 'runtime_error' && 'Runtime error'}
            {executionStatus === 'tle' && 'Time limit exceeded'}
          </span>
        </div>

        <span
          className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold lg:inline-flex ${backendBadgeClassName}`}
        >
          {backendStatus === 'ready'
            ? runnerLabel
            : backendStatus === 'checking'
              ? 'Checking'
              : 'Offline'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="hidden items-center gap-1 rounded-md border border-border px-2 py-1 lg:flex"
          style={{ background: 'var(--secondary)' }}
        >
          <button
            onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 select-none text-center font-mono text-xs text-muted-foreground">
            {fontSize}
          </span>
          <button
            onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Increase font size"
            aria-label="Increase font size"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setLangDropdownOpen((current) => !current)}
            className="flex min-w-[150px] items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:border-primary/50"
            style={{ background: 'var(--secondary)' }}
            aria-haspopup="listbox"
            aria-expanded={langDropdownOpen}
          >
            <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
              {currentLang.icon}
            </span>
            <span className="flex-1 text-left text-sm">{currentLang.label}</span>
            <ChevronDown
              size={14}
              className={`text-muted-foreground transition-transform duration-150 ${
                langDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {langDropdownOpen && (
            <div
              className="fade-in absolute left-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border shadow-xl"
              style={{ background: 'var(--card)', minWidth: '190px' }}
              role="listbox"
            >
              {availableLanguages.map((langKey) => {
                const config = LANGUAGE_CONFIGS[langKey];
                return (
                  <button
                    key={langKey}
                    onClick={() => {
                      onLanguageChange(langKey);
                      setLangDropdownOpen(false);
                    }}
                    className={`lang-selector-option flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-100 ${
                      language === langKey ? 'active' : 'text-muted-foreground'
                    }`}
                    role="option"
                    aria-selected={language === langKey}
                  >
                    <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                      {config.icon}
                    </span>
                    <span className="flex-1">{config.label}</span>
                    {language === langKey ? (
                      <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button
          onClick={onFormat}
          className="btn-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
          title="Format code (Ctrl/Cmd+Shift+F)"
          aria-label="Format code"
        >
          <WandSparkles size={15} />
          <span className="hidden md:inline">Format</span>
        </button>

        <div className="relative" ref={saveDropdownRef}>
          <button
            onClick={() => setSaveDropdownOpen((current) => !current)}
            className="btn-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
            title="Save file (Ctrl/Cmd+S)"
            aria-label="Save code"
            aria-haspopup="true"
            aria-expanded={saveDropdownOpen}
          >
            <Save size={15} />
            <span className="hidden md:inline">Save</span>
            <ChevronDown
              size={12}
              className={`text-muted-foreground transition-transform duration-150 ${
                saveDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {saveDropdownOpen && (
            <div
              className="fade-in absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border shadow-xl"
              style={{ background: 'var(--card)' }}
            >
              <button
                onClick={() => {
                  onDownload();
                  setSaveDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Download size={15} />
                <span>Download</span>
              </button>
              <div className="mx-2 h-px bg-border" />
              <button
                onClick={() => {
                  onSaveToGitHub();
                  setSaveDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <GitBranch size={15} />
                <span>Save to GitHub</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClear}
          className="btn-ghost flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
          title="Clear input and output"
          aria-label="Clear input and output"
        >
          <Trash2 size={15} />
          <span className="hidden md:inline">Clear</span>
        </button>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {isRunning ? (
          <button
            onClick={onCancelRun}
            className="flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{ background: 'var(--error)', color: '#fff' }}
            aria-label="Stop execution"
          >
            <Square size={14} className="fill-white" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={() => {
              void onRun();
            }}
            className="btn-primary flex items-center gap-2 rounded-md px-4 py-1.5 text-sm"
            title="Run code (Ctrl/Cmd+Enter)"
            aria-label="Run code"
          >
            <Play size={14} className="fill-current" />
            <span>Run</span>
            <span className="kbd hidden lg:inline-flex">Ctrl+Enter</span>
          </button>
        )}

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button
          onClick={onToggleTheme}
          className="btn-ghost rounded-md p-2"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative hidden lg:block" ref={shortcutsRef}>
          <button
            onClick={() => setShortcutsOpen((current) => !current)}
            className="btn-ghost rounded-md p-2"
            title="Keyboard shortcuts"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {shortcutsOpen && (
            <div
              className="fade-in absolute right-0 top-full z-50 mt-1 min-w-[260px] rounded-lg border border-border p-3 shadow-xl"
              style={{ background: 'var(--card)' }}
            >
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Keyboard shortcuts
              </p>
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between px-1 py-1.5"
                >
                  <span className="text-sm text-foreground">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <span key={`${shortcut.action}-${key}`} className="kbd">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
