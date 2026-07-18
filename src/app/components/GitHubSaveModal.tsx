'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface GitHubSaveModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
  fileName: string;
}

export default function GitHubSaveModal({
  open,
  onClose,
  code,
  fileName: defaultFileName,
}: GitHubSaveModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [fileName, setFileName] = useState(defaultFileName);
  const [saving, setSaving] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    repoUrl: string;
    fileName: string;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmOverwrite(false);
      setPendingOverwrite(null);
      setTimeout(() => repoInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const handleSave = async (overwrite = false) => {
    if (!repoUrl.trim() || !fileName.trim()) {
      toast.error('Please enter both repository URL and file name');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/compiler/github/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          fileName: fileName.trim(),
          code,
          overwrite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.conflict) {
          setPendingOverwrite({
            repoUrl: repoUrl.trim(),
            fileName: fileName.trim(),
          });
          setConfirmOverwrite(true);
          return;
        }
        throw new Error(data.error || 'Failed to save to GitHub');
      }

      toast.success(`File ${data.action} successfully on GitHub`);
      setConfirmOverwrite(false);
      setPendingOverwrite(null);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save to GitHub');
    } finally {
      setSaving(false);
    }
  };

  const confirmAndSave = () => {
    if (pendingOverwrite) {
      handleSave(true);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="fade-in w-full max-w-md rounded-xl border border-border p-6 shadow-2xl"
        style={{ background: 'var(--card)' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--secondary)' }}
            >
              <GitBranch size={16} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Save to GitHub
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Repository URL
            </label>
            <input
              ref={repoInputRef}
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/cheenu-exe/DSA"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50"
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="main.cpp"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50"
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
              disabled={saving}
            />
          </div>

          {confirmOverwrite && (
            <div
              className="rounded-lg border border-warning/30 px-4 py-3 text-sm"
              style={{ background: 'var(--warning-bg, rgba(234,179,8,0.08))' }}
            >
              <p className="mb-2 font-medium" style={{ color: 'var(--warning, #eab308)' }}>
                File already exists
              </p>
              <p className="text-muted-foreground">
                A file named{' '}
                <span className="font-mono text-foreground">{pendingOverwrite?.fileName}</span>{' '}
                already exists in this repository. Replace it?
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmAndSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all"
                  style={{ background: 'var(--warning, #eab308)', color: '#000' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Replace
                </button>
                <button
                  onClick={() => setConfirmOverwrite(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  style={{ background: 'var(--secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              style={{ background: 'var(--secondary)' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !repoUrl.trim() || !fileName.trim()}
              className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
