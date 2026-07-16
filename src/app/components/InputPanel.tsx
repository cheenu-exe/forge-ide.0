'use client';

import React, { useRef } from 'react';
import { Clipboard, Terminal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PLACEHOLDER_TEXT = `Enter custom input here...

Example:
5
1 2 3 4 5

Each line is passed to stdin during execution.`;

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  isRunning: boolean;
}

export default function InputPanel({ value, onChange, isRunning }: InputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(value + text);
      toast.success('Pasted from clipboard', { duration: 1200 });
    } catch {
      toast.error('Clipboard access denied', { duration: 1500 });
    }
  };

  const handleClear = () => {
    onChange('');
    textareaRef.current?.focus();
  };

  const lineCount = value ? value.split('\n').length : 0;
  const charCount = value.length;

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-r border-border"
      style={{ background: 'var(--panel-bg)' }}
    >
      <div className="panel-header border-b border-border">
        <Terminal size={14} className="flex-shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">stdin</span>
        <span className="ml-1 hidden text-[11px] text-muted-foreground/50 sm:inline">
          | Custom input
        </span>
        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={handlePaste}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            title="Paste from clipboard"
            aria-label="Paste from clipboard"
          >
            <Clipboard size={13} />
          </button>
          {value ? (
            <button
              onClick={handleClear}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-error"
              title="Clear input"
              aria-label="Clear input"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isRunning}
          placeholder={PLACEHOLDER_TEXT}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="h-full w-full resize-none bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.65',
          }}
          aria-label="Standard input for code execution"
        />

        {isRunning ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(26, 26, 29, 0.4)' }}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="spinner h-3 w-3 rounded-full border-2 border-accent border-t-transparent" />
              <span>Running...</span>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="flex items-center justify-between border-t border-border px-3 py-1"
        style={{ background: 'var(--background)' }}
      >
        <div className="flex items-center gap-3">
          {value ? (
            <>
              <span className="text-[11px] text-muted-foreground/60">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
              <span className="text-[11px] text-muted-foreground/40">|</span>
              <span className="text-[11px] text-muted-foreground/60">{charCount} chars</span>
            </>
          ) : (
            <span className="text-[11px] italic text-muted-foreground/40">
              Empty input. Code will read from stdin as-is.
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: value ? 'var(--accent)' : 'var(--muted)' }}
          />
          <span className="text-[11px] text-muted-foreground/50">
            {value ? 'Has input' : 'No input'}
          </span>
        </div>
      </div>
    </div>
  );
}
