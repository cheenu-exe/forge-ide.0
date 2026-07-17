'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FileCode2 } from 'lucide-react';

import { LANGUAGE_CONFIGS, type LanguageKey } from '../utils/languageConfigs';

const SKELETON_LINES = [
  '45%',
  '0%',
  '60%',
  '75%',
  '80%',
  '55%',
  '0%',
  '65%',
  '70%',
  '45%',
  '0%',
  '50%',
  '60%',
  '40%',
  '0%',
  '55%',
  '35%',
  '0%',
];

const MonacoEditor = dynamic(() => import('./MonacoEditorWrapper'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

interface EditorPanelProps {
  language: LanguageKey;
  code: string;
  onChange: (value: string) => void;
  theme: 'dark' | 'light';
  fontSize: number;
}

export default function EditorPanel({
  language,
  code,
  onChange,
  theme,
  fontSize,
}: EditorPanelProps) {
  const langConfig = LANGUAGE_CONFIGS[language];

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: 'var(--editor-bg)' }}
    >
      <div className="panel-header border-b border-border">
        <FileCode2 size={14} className="flex-shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          solution.{langConfig.extension}
        </span>
        <span className="ml-1 text-xs text-muted-foreground/50">({langConfig.label})</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-muted-foreground/60 md:block">
            {langConfig.version}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <span className="hidden sm:inline">UTF-8</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">LF</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          language={langConfig.monacoLanguage}
          value={code}
          onChange={onChange}
          theme={theme}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full flex-col" style={{ background: 'var(--editor-bg)' }}>
      <div className="flex h-full">
        <div
          className="w-12 flex-shrink-0 space-y-2 border-r border-border p-2"
          style={{ background: 'rgba(0, 0, 0, 0.15)' }}
        >
          {Array.from({ length: 18 }).map((_, index) => (
            <div
              key={`gutter-line-${index + 1}`}
              className="h-3 animate-pulse rounded"
              style={{
                background: 'var(--muted)',
                width: `${18 + (index % 3) * 4}px`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
        <div className="flex-1 space-y-2 p-4">
          {SKELETON_LINES.map((width, index) => (
            <div
              key={`code-line-${index + 1}`}
              className="h-3.5 animate-pulse rounded"
              style={{
                background: 'var(--muted)',
                width,
                opacity: 0.25,
                transitionDelay: `${index * 30}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
