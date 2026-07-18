'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { toast } from 'sonner';

import EditorPanel from './EditorPanel';
import GitHubSaveModal from './GitHubSaveModal';
import InputPanel from './InputPanel';
import Navbar from './Navbar';
import OutputPanel from './OutputPanel';
import { LANGUAGE_CONFIGS, LANGUAGE_ORDER, type LanguageKey } from '../utils/languageConfigs';
import {
  type BackendStatus,
  type CompilerRuntimeStatus,
  type ExecutionResult,
  type ExecutionStatus,
} from '../utils/types';

const STORAGE_KEY = 'forge-workspace:v1';

interface StoredWorkspace {
  theme: 'dark' | 'light';
  language: LanguageKey;
  input: string;
  fontSize: number;
  drafts: Partial<Record<LanguageKey, string>>;
}

function getDefaultCode(language: LanguageKey) {
  return LANGUAGE_CONFIGS[language].starterTemplate;
}

export default function IDEWorkspace() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<LanguageKey>('cpp');
  const [code, setCode] = useState<string>(getDefaultCode('cpp'));
  const [drafts, setDrafts] = useState<Partial<Record<LanguageKey, string>>>({
    cpp: getDefaultCode('cpp'),
  });
  const [input, setInput] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageKey[]>(LANGUAGE_ORDER);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [runtimeStatus, setRuntimeStatus] = useState<CompilerRuntimeStatus | null>(null);
  const [githubSaveOpen, setGitHubSaveOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedStorageRef = useRef(false);

  const runnerLabel = useMemo(() => {
    if (!runtimeStatus) {
      return 'Checking runner';
    }

    if (runtimeStatus.engine === 'docker') {
      return 'Docker runner';
    }

    if (runtimeStatus.engine === 'local') {
      return 'Local runner';
    }

    return 'Runner unavailable';
  }, [runtimeStatus]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      return;
    }

    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }, [theme]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        hasLoadedStorageRef.current = true;
        return;
      }

      const storedWorkspace = JSON.parse(rawValue) as StoredWorkspace;
      const nextLanguage = LANGUAGE_CONFIGS[storedWorkspace.language]
        ? storedWorkspace.language
        : 'cpp';
      const nextDrafts = Object.fromEntries(
        Object.entries(storedWorkspace.drafts || {}).filter(([key]) => key in LANGUAGE_CONFIGS)
      ) as Partial<Record<LanguageKey, string>>;

      setTheme(storedWorkspace.theme === 'light' ? 'light' : 'dark');
      setInput(storedWorkspace.input ?? '');
      setFontSize(
        typeof storedWorkspace.fontSize === 'number'
          ? Math.min(24, Math.max(10, storedWorkspace.fontSize))
          : 14
      );
      setLanguage(nextLanguage);
      setDrafts({
        ...nextDrafts,
        [nextLanguage]: nextDrafts[nextLanguage] ?? getDefaultCode(nextLanguage),
      });
      setCode(nextDrafts[nextLanguage] ?? getDefaultCode(nextLanguage));
    } catch {
      setTheme('dark');
      setLanguage('cpp');
      setCode(getDefaultCode('cpp'));
    } finally {
      hasLoadedStorageRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorageRef.current) {
      return;
    }

    const payload: StoredWorkspace = {
      theme,
      language,
      input,
      fontSize,
      drafts: {
        ...drafts,
        [language]: code,
      },
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [code, drafts, fontSize, input, language, theme]);

  const loadRuntimeStatus = useCallback(async () => {
    setBackendStatus('checking');

    try {
      const response = await fetch('/api/compiler/languages', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load compiler runtime details.');
      }

      const data = (await response.json()) as CompilerRuntimeStatus;
      const nextAvailableLanguages = data.languages
        .filter((item) => item.available && item.key in LANGUAGE_CONFIGS)
        .map((item) => item.key);

      setRuntimeStatus(data);
      setAvailableLanguages(
        nextAvailableLanguages.length ? nextAvailableLanguages : LANGUAGE_ORDER
      );
      setBackendStatus('ready');

      if (nextAvailableLanguages.length && !nextAvailableLanguages.includes(language)) {
        const nextLanguage = nextAvailableLanguages[0];
        setLanguage(nextLanguage);
        setCode(drafts[nextLanguage] ?? getDefaultCode(nextLanguage));
      }
    } catch {
      setRuntimeStatus(null);
      setAvailableLanguages(LANGUAGE_ORDER);
      setBackendStatus('offline');
    }
  }, [drafts, language]);

  useEffect(() => {
    void loadRuntimeStatus();
  }, [loadRuntimeStatus]);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [language]: value,
      }));
    },
    [language]
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: LanguageKey) => {
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [language]: code,
      }));
      setLanguage(nextLanguage);
      setCode(drafts[nextLanguage] ?? getDefaultCode(nextLanguage));
      setExecutionResult(null);
      setExecutionStatus('idle');
      toast.info(`Switched to ${LANGUAGE_CONFIGS[nextLanguage].label}`, {
        duration: 1400,
      });
    },
    [code, drafts, language]
  );

  const handleRunCode = useCallback(async () => {
    if (isRunning) {
      return;
    }

    if (backendStatus === 'offline') {
      setExecutionStatus('runtime_error');
      setExecutionResult({
        stdout: '',
        stderr:
          'Compiler backend is offline. Start the FastAPI service on port 8000 or set COMPILER_BACKEND_URL.',
        exitCode: 1,
        executionTime: 0,
        memoryUsage: 0,
        status: 'runtime_error',
        compilationOutput: '',
      });
      toast.error('Compiler backend is offline', { duration: 2500 });
      return;
    }

    if (!availableLanguages.includes(language)) {
      const reason =
        runtimeStatus?.languages.find((item) => item.key === language)?.reason ??
        'This language is not available on the current runner.';
      setExecutionStatus('runtime_error');
      setExecutionResult({
        stdout: '',
        stderr: reason,
        exitCode: 1,
        executionTime: 0,
        memoryUsage: 0,
        status: 'runtime_error',
        compilationOutput: reason,
      });
      toast.error(reason, { duration: 2500 });
      return;
    }

    setIsRunning(true);
    setExecutionStatus('running');
    setExecutionResult(null);
    abortControllerRef.current = new AbortController();

    const startedAt = Date.now();

    try {
      const response = await fetch('/api/compiler/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          code,
          stdin: input,
          timeLimit: 15,
        }),
        signal: abortControllerRef.current.signal,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? 'The compiler backend returned an unexpected error.');
      }

      const result = payload as ExecutionResult;
      result.executionTime = Math.max(result.executionTime, Date.now() - startedAt);

      setExecutionResult(result);
      setExecutionStatus(result.status);

      if (result.status === 'success') {
        toast.success('Code executed successfully', { duration: 1800 });
      } else if (result.status === 'compile_error') {
        toast.error('Compilation failed', { duration: 2400 });
      } else if (result.status === 'runtime_error') {
        toast.error('Runtime error', { duration: 2400 });
      } else if (result.status === 'tle') {
        toast.error('Time limit exceeded', { duration: 2400 });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setExecutionStatus('idle');
        setExecutionResult(null);
        toast.info('Execution cancelled', { duration: 1500 });
      } else {
        const message =
          error instanceof Error ? error.message : 'Compiler backend could not be reached.';

        setExecutionStatus('runtime_error');
        setExecutionResult({
          stdout: '',
          stderr: message,
          exitCode: 1,
          executionTime: Date.now() - startedAt,
          memoryUsage: 0,
          status: 'runtime_error',
          compilationOutput: '',
        });
        toast.error('Execution failed', { duration: 2500 });
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [availableLanguages, backendStatus, code, input, isRunning, language, runtimeStatus]);

  const handleCancelRun = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setExecutionStatus('idle');
  }, []);

  const handleClear = useCallback(() => {
    setCode(getDefaultCode(language));
    setInput('');
    setExecutionResult(null);
    setExecutionStatus('idle');
    toast.info('Editor cleared', { duration: 1200 });
  }, [language]);

  const handleFormatCode = useCallback(async () => {
    try {
      const response = await fetch('/api/compiler/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      if (!response.ok) throw new Error('Format request failed');
      const data = await response.json();
      if (data.formattedCode !== code) {
        setCode(data.formattedCode);
        toast.success('Code formatted', { duration: 1200 });
      } else {
        toast.info('Code is already formatted', { duration: 1200 });
      }
    } catch {
      window.dispatchEvent(new CustomEvent('forge:format-code'));
      toast.success('Formatter requested', { duration: 1200 });
    }
  }, [language, code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solution.${LANGUAGE_CONFIGS[language].extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Downloaded solution.${LANGUAGE_CONFIGS[language].extension}`,
      { duration: 1400 },
    );
  }, [code, language]);

  const handleSaveToGitHub = useCallback(() => {
    setGitHubSaveOpen(true);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.userAgent.toUpperCase().includes('MAC');
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      if (ctrlOrCmd && event.key === 'Enter') {
        event.preventDefault();
        void handleRunCode();
      } else if (ctrlOrCmd && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleDownload();
      } else if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        handleFormatCode();
      }
    };

    const handleRunEvent = () => {
      void handleRunCode();
    };
    const handleSaveEvent = () => {
      handleDownload();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('forge:run-code', handleRunEvent);
    window.addEventListener('forge:save-code', handleSaveEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('forge:run-code', handleRunEvent);
      window.removeEventListener('forge:save-code', handleSaveEvent);
    };
  }, [handleFormatCode, handleRunCode, handleDownload]);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      <Navbar
        language={language}
        availableLanguages={availableLanguages}
        onLanguageChange={handleLanguageChange}
        onRun={handleRunCode}
        onClear={handleClear}
        onFormat={handleFormatCode}
        onDownload={handleDownload}
        onSaveToGitHub={handleSaveToGitHub}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        isRunning={isRunning}
        onCancelRun={handleCancelRun}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        executionStatus={executionStatus}
        backendStatus={backendStatus}
        runnerLabel={runnerLabel}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical" className="h-full">
          <Panel defaultSize={70} minSize={30} className="overflow-hidden">
            <EditorPanel
              language={language}
              code={code}
              onChange={handleCodeChange}
              theme={theme}
              fontSize={fontSize}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle-vertical h-[3px] w-full flex-shrink-0 transition-colors duration-150" />

          <Panel defaultSize={30} minSize={15} className="overflow-hidden">
            <PanelGroup direction="horizontal" className="h-full">
              <Panel defaultSize={40} minSize={20} className="overflow-hidden">
                <InputPanel value={input} onChange={setInput} isRunning={isRunning} />
              </Panel>

              <PanelResizeHandle className="resize-handle-horizontal h-full w-[3px] flex-shrink-0 transition-colors duration-150" />

              <Panel defaultSize={60} minSize={25} className="overflow-hidden">
                <OutputPanel
                  result={executionResult}
                  status={executionStatus}
                  isRunning={isRunning}
                />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <GitHubSaveModal
        open={githubSaveOpen}
        onClose={() => setGitHubSaveOpen(false)}
        code={code}
        fileName={`solution.${LANGUAGE_CONFIGS[language].extension}`}
      />
    </div>
  );
}
