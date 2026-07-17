import type { LanguageKey } from './languageConfigs';

export type ExecutionStatus =
  'idle' | 'running' | 'success' | 'compile_error' | 'runtime_error' | 'tle';

export type BackendStatus = 'checking' | 'ready' | 'offline';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsage: number;
  status: ExecutionStatus;
  compilationOutput: string;
}

export interface ExecutionRequest {
  language: LanguageKey;
  code: string;
  stdin: string;
  timeLimit?: number;
}

export interface CompilerLanguageStatus {
  key: LanguageKey;
  label: string;
  version: string;
  available: boolean;
  reason?: string | null;
}

export interface CompilerRuntimeStatus {
  engine: 'docker' | 'local' | 'unavailable';
  dockerAvailable: boolean;
  languages: CompilerLanguageStatus[];
}
