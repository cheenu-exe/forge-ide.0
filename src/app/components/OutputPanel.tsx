'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Loader2,
  Terminal,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { type ExecutionResult, type ExecutionStatus } from '../utils/types';

interface OutputPanelProps {
  result: ExecutionResult | null;
  status: ExecutionStatus;
  isRunning: boolean;
}

export default function OutputPanel({ result, status, isRunning }: OutputPanelProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'compiler'>('output');

  useEffect(() => {
    if (outputRef.current && result) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result]);

  useEffect(() => {
    if (status === 'compile_error') {
      setActiveTab('compiler');
      return;
    }

    if (status === 'success' || status === 'runtime_error' || status === 'tle') {
      setActiveTab('output');
    }
  }, [status]);

  const hasCompilerOutput = Boolean(result?.compilationOutput?.trim());
  const hasVisibleContent =
    activeTab === 'compiler'
      ? hasCompilerOutput
      : Boolean(result?.stdout || result?.stderr || result?.compilationOutput);

  const handleCopyOutput = async () => {
    if (!result) {
      return;
    }

    const text =
      activeTab === 'compiler'
        ? result.compilationOutput
        : result.stdout || result.stderr || result.compilationOutput;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard', { duration: 1200 });
    } catch {
      toast.error('Failed to copy output', { duration: 1500 });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--panel-bg)' }}>
      <div className="panel-header border-b border-border">
        <Terminal size={14} className="flex-shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">stdout</span>
        {status !== 'idle' ? <StatusBadge status={status} /> : null}

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setActiveTab('output')}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              activeTab === 'output'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            Output
          </button>
          {hasCompilerOutput ? (
            <button
              onClick={() => setActiveTab('compiler')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
                activeTab === 'compiler'
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              Compiler
              {status === 'compile_error' ? (
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-error" />
              ) : null}
            </button>
          ) : null}
        </div>

        {hasVisibleContent ? (
          <button
            onClick={handleCopyOutput}
            className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            title="Copy output"
            aria-label="Copy output"
          >
            <Copy size={13} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {isRunning ? (
          <RunningState />
        ) : !result ? (
          <IdleState />
        ) : activeTab === 'output' ? (
          <OutputContent result={result} outputRef={outputRef} />
        ) : (
          <CompilerContent result={result} />
        )}
      </div>

      {result && !isRunning ? <ExecutionMetrics result={result} status={status} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const configs: Record<
    ExecutionStatus,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    idle: { label: 'Idle', icon: null, className: 'status-badge-idle' },
    running: {
      label: 'Running',
      icon: <Loader2 size={10} className="spinner" />,
      className: 'status-badge-running',
    },
    success: {
      label: 'Accepted',
      icon: <CheckCircle2 size={10} />,
      className: 'status-badge-success',
    },
    compile_error: {
      label: 'Compile error',
      icon: <XCircle size={10} />,
      className: 'status-badge-error',
    },
    runtime_error: {
      label: 'Runtime error',
      icon: <AlertCircle size={10} />,
      className: 'status-badge-error',
    },
    tle: {
      label: 'Time limit',
      icon: <AlertTriangle size={10} />,
      className: 'status-badge-warning',
    },
  };

  const config = configs[status];

  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function RunningState() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((current) => (current.length >= 3 ? '' : `${current}.`));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="relative">
        <div className="spinner h-10 w-10 rounded-full border-2 border-accent border-t-transparent" />
        <div
          className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary/20 border-b-transparent"
          style={{ animationDirection: 'reverse', animationDuration: '1.4s' }}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Executing code{dots}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Waiting for the compiler runner to finish.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {['Compile', 'Run', 'Collect output'].map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-[11px] text-muted-foreground">{step}</span>
            </div>
            {index < 2 ? <span className="text-[11px] text-muted-foreground/30">-&gt;</span> : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: 'rgba(255, 161, 22, 0.08)' }}
      >
        <Terminal size={18} className="text-primary opacity-60" />
      </div>
      <p className="text-sm text-muted-foreground">Output appears here after execution.</p>
      <p className="text-xs text-muted-foreground/50">Use Ctrl/Cmd + Enter to run your code.</p>
    </div>
  );
}

function OutputContent({
  result,
  outputRef,
}: {
  result: ExecutionResult;
  outputRef: React.RefObject<HTMLDivElement | null>;
}) {
  const stdoutLines = (result.stdout || '').split('\n');
  const stderrLines = (result.stderr || '').split('\n').filter(Boolean);
  const isEmpty = !result.stdout && !result.stderr;

  if (isEmpty) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">No output produced.</p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            The program exited without writing to stdout.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={outputRef}
      className="flex-1 overflow-auto p-3 font-mono"
      style={{ fontSize: '13px', lineHeight: '1.65' }}
    >
      {result.stdout ? (
        <div className="mb-2">
          {stdoutLines.map((line, index) => (
            <div
              key={`stdout-line-${index + 1}`}
              className="output-line-stdout whitespace-pre-wrap break-all"
            >
              {line || <span className="select-none opacity-0">.</span>}
            </div>
          ))}
        </div>
      ) : null}

      {stderrLines.length ? (
        <div className="mt-2 border-t border-border/50 pt-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertCircle size={11} className="flex-shrink-0 text-error" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-error">
              stderr
            </span>
          </div>
          {stderrLines.map((line, index) => (
            <div
              key={`stderr-line-${index + 1}`}
              className="output-line-stderr whitespace-pre-wrap break-all"
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompilerContent({ result }: { result: ExecutionResult }) {
  const lines = (result.compilationOutput || '').split('\n');
  const isError = result.status === 'compile_error';

  return (
    <div
      className="flex-1 overflow-auto p-3 font-mono"
      style={{ fontSize: '12px', lineHeight: '1.65' }}
    >
      {isError ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-error/20 bg-error-subtle p-2">
          <XCircle size={14} className="flex-shrink-0 text-error" />
          <span className="text-xs font-semibold text-error">Compilation failed</span>
        </div>
      ) : null}

      {lines.map((line, index) => {
        const isErrorLine = line.includes('error:') || line.includes('Error:');
        const isWarningLine = line.includes('warning:') || line.includes('Warning:');
        const isNoteLine = line.includes('note:') || line.startsWith('  ');

        let lineClassName = 'output-line-info';
        if (isErrorLine) {
          lineClassName = 'output-line-stderr';
        } else if (isWarningLine) {
          lineClassName = 'output-line-warning';
        } else if (!isNoteLine && line.trim()) {
          lineClassName = 'output-line-success';
        }

        return (
          <div
            key={`compiler-line-${index + 1}`}
            className={`${lineClassName} whitespace-pre-wrap break-all`}
          >
            {line || <span className="select-none opacity-0">.</span>}
          </div>
        );
      })}
    </div>
  );
}

function ExecutionMetrics({
  result,
  status,
}: {
  result: ExecutionResult;
  status: ExecutionStatus;
}) {
  const isSuccess = status === 'success';
  const isError = status === 'compile_error' || status === 'runtime_error';

  const formatTime = (milliseconds: number) => {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    }

    return `${milliseconds}ms`;
  };

  const formatMemory = (kilobytes: number) => {
    if (kilobytes >= 1024) {
      return `${(kilobytes / 1024).toFixed(1)} MB`;
    }

    return `${kilobytes} KB`;
  };

  return (
    <div
      className="flex items-center gap-4 border-t border-border px-3 py-1.5"
      style={{ background: 'var(--background)' }}
    >
      <div className="flex items-center gap-1.5">
        {isSuccess ? (
          <CheckCircle2 size={12} className="flex-shrink-0 text-success" />
        ) : isError ? (
          <XCircle size={12} className="flex-shrink-0 text-error" />
        ) : (
          <AlertCircle size={12} className="flex-shrink-0 text-warning" />
        )}
        <span
          className={`font-mono text-[11px] font-semibold ${
            isSuccess ? 'text-success' : isError ? 'text-error' : 'text-warning'
          }`}
        >
          exit {result.exitCode}
        </span>
      </div>

      <div className="h-3.5 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <Clock size={11} className="flex-shrink-0 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatTime(result.executionTime)}
        </span>
      </div>

      {result.memoryUsage > 0 ? (
        <div className="flex items-center gap-1.5">
          <Cpu size={11} className="flex-shrink-0 text-muted-foreground" />
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatMemory(result.memoryUsage)}
          </span>
        </div>
      ) : null}

      <div className="flex-1" />

      <span
        className={`text-[11px] font-semibold ${
          isSuccess ? 'text-success' : isError ? 'text-error' : 'text-muted-foreground'
        }`}
      >
        {isSuccess
          ? 'Accepted'
          : status === 'compile_error'
            ? 'Compile error'
            : status === 'runtime_error'
              ? 'Runtime error'
              : status === 'tle'
                ? 'Time limit exceeded'
                : 'Ready'}
      </span>
    </div>
  );
}
