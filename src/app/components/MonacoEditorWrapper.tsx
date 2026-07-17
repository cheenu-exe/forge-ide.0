'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor, languages } from 'monaco-editor';

interface MonacoEditorWrapperProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme: 'dark' | 'light';
  fontSize: number;
}

function registerFormatProviders(monaco: Monaco): void {
  const formatLanguages = [
    { id: 'python', indentSize: 4 },
    { id: 'cpp', indentSize: 2 },
    { id: 'c', indentSize: 2 },
    { id: 'java', indentSize: 4 },
    { id: 'javascript', indentSize: 2 },
    { id: 'go', indentSize: 1 },
    { id: 'rust', indentSize: 4 },
    { id: 'php', indentSize: 4 },
    { id: 'csharp', indentSize: 4 },
  ];

  const provider = (tabSize: number): languages.DocumentFormattingEditProvider => ({
    provideDocumentFormattingEdits(model) {
      const fullRange = model.getFullModelRange();
      const raw = model.getValue();
      const lines = raw.split('\n');
      const result: string[] = [];

      for (const line of lines) {
        result.push(line.replace(/\s+$/, '').replace(/\t/g, ' '.repeat(tabSize)));
      }

      while (result.length > 0 && result[result.length - 1] === '') {
        result.pop();
      }

      const formatted = result.join('\n') + '\n';
      if (formatted === raw) return [];

      return [{ range: fullRange, text: formatted }];
    },
  });

  for (const lang of formatLanguages) {
    try {
      monaco.languages.registerDocumentFormattingEditProvider(lang.id, provider(lang.indentSize));
    } catch {
      // skip languages not yet registered
    }
  }
}

export default function MonacoEditorWrapper({
  language,
  value,
  onChange,
  theme,
  fontSize,
}: MonacoEditorWrapperProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorMount: OnMount = useCallback(
    (editorInstance, monacoInstance) => {
      editorRef.current = editorInstance;
      monacoRef.current = monacoInstance;

      monacoInstance.editor.defineTheme('forge-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A7280', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'C792EA' },
          { token: 'string', foreground: 'A5D6A7' },
          { token: 'number', foreground: 'F78C6C' },
          { token: 'type', foreground: 'FFCB6B' },
          { token: 'function', foreground: '82AAFF' },
          { token: 'variable', foreground: 'EEFFFF' },
          { token: 'operator', foreground: '89DDFF' },
          { token: 'delimiter', foreground: '89DDFF' },
          { token: 'identifier', foreground: 'EEFFFF' },
        ],
        colors: {
          'editor.background': '#1F1F23',
          'editor.foreground': '#EEFFFF',
          'editor.lineHighlightBackground': '#26272B',
          'editor.selectionBackground': '#3A3B5A',
          'editor.inactiveSelectionBackground': '#2D2D3A',
          'editorLineNumber.foreground': '#4A4B52',
          'editorLineNumber.activeForeground': '#A0A0A0',
          'editorCursor.foreground': '#FFA116',
          'editor.selectionHighlightBackground': '#2A2B3A',
          'editorIndentGuide.background': '#2D2D35',
          'editorIndentGuide.activeBackground': '#3A3B45',
          'editorBracketMatch.background': '#FFA11620',
          'editorBracketMatch.border': '#FFA116',
          'editorGutter.background': '#1A1A1E',
          'scrollbar.shadow': '#00000000',
          'scrollbarSlider.background': '#3A3B3F66',
          'scrollbarSlider.hoverBackground': '#3A3B3FAA',
          'scrollbarSlider.activeBackground': '#FFA11688',
          'minimap.background': '#1A1A1E',
          'editorWidget.background': '#26272B',
          'editorWidget.border': '#3A3B3F',
          'editorSuggestWidget.background': '#26272B',
          'editorSuggestWidget.border': '#3A3B3F',
          'editorSuggestWidget.selectedBackground': '#FFA11622',
          'editorHoverWidget.background': '#26272B',
          'editorHoverWidget.border': '#3A3B3F',
          'input.background': '#1F1F23',
          'input.border': '#3A3B3F',
          focusBorder: '#FFA116',
        },
      });

      monacoInstance.editor.defineTheme('forge-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A7280', fontStyle: 'italic' },
          { token: 'keyword', foreground: '7C3AED' },
          { token: 'string', foreground: '059669' },
          { token: 'number', foreground: 'EA580C' },
          { token: 'type', foreground: 'B45309' },
          { token: 'function', foreground: '2563EB' },
          { token: 'variable', foreground: '1F2937' },
          { token: 'operator', foreground: '0891B2' },
        ],
        colors: {
          'editor.background': '#FAFAFA',
          'editor.foreground': '#1F2937',
          'editor.lineHighlightBackground': '#F3F4F6',
          'editor.selectionBackground': '#DBEAFE',
          'editorLineNumber.foreground': '#9CA3AF',
          'editorLineNumber.activeForeground': '#4B5563',
          'editorCursor.foreground': '#FFA116',
          'editorBracketMatch.background': '#FFA11620',
          'editorBracketMatch.border': '#FFA116',
          focusBorder: '#FFA116',
        },
      });

      monacoInstance.editor.setTheme(theme === 'dark' ? 'forge-dark' : 'forge-light');

      editorInstance.addAction({
        id: 'forge.format',
        label: 'Format document',
        keybindings: [
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
        ],
        run: (instance) => {
          instance.getAction('editor.action.formatDocument')?.run();
        },
      });

      editorInstance.addAction({
        id: 'forge.save',
        label: 'Save file',
        keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
        run: () => {
          window.dispatchEvent(new CustomEvent('forge:save-code'));
        },
      });

      editorInstance.addAction({
        id: 'forge.run',
        label: 'Run code',
        keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter],
        run: () => {
          window.dispatchEvent(new CustomEvent('forge:run-code'));
        },
      });

      registerFormatProviders(monacoInstance);

      editorInstance.focus();
    },
    [theme]
  );

  useEffect(() => {
    const handleFormat = () => {
      editorRef.current?.getAction('editor.action.formatDocument')?.run();
    };

    window.addEventListener('forge:format-code', handleFormat);
    return () => window.removeEventListener('forge:format-code', handleFormat);
  }, []);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'forge-dark' : 'forge-light');
    }
  }, [theme]);

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize });
  }, [fontSize]);

  const handleChange = useCallback(
    (nextValue: string | undefined) => {
      onChange(nextValue ?? '');
    },
    [onChange]
  );

  return (
    <Editor
      height="100%"
      width="100%"
      language={language}
      value={value}
      onChange={handleChange}
      onMount={handleEditorMount}
      theme={theme === 'dark' ? 'forge-dark' : 'forge-light'}
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontLigatures: true,
        lineHeight: 1.7,
        letterSpacing: 0.3,
        minimap: {
          enabled: true,
          side: 'right',
          showSlider: 'mouseover',
          scale: 1,
          maxColumn: 80,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        detectIndentation: true,
        formatOnPaste: true,
        formatOnType: false,
        autoIndent: 'full',
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: 'active',
          indentation: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        acceptSuggestionOnEnter: 'smart',
        parameterHints: { enabled: true },
        hover: { enabled: true, delay: 300 },
        contextmenu: true,
        mouseWheelZoom: true,
        multiCursorModifier: 'alt',
        selectionHighlight: true,
        occurrencesHighlight: 'singleFile',
        codeLens: false,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'mouseover',
        matchBrackets: 'always',
        renderWhitespace: 'selection',
        renderLineHighlight: 'line',
        lineNumbers: 'on',
        lineNumbersMinChars: 3,
        glyphMargin: false,
        overviewRulerLanes: 2,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        padding: { top: 12, bottom: 12 },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle: 'line',
        smoothScrolling: true,
        stickyScroll: { enabled: false },
        copyWithSyntaxHighlighting: false,
        accessibilitySupport: 'auto',
        snippetSuggestions: 'top',
        wordBasedSuggestions: 'allDocuments',
        tabCompletion: 'on',
        linkedEditing: true,
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'selection',
        },
      }}
    />
  );
}
