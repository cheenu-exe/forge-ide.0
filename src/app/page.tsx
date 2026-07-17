import React from 'react';
import IDEWorkspace from './components/IDEWorkspace';
import { Toaster } from 'sonner';

export default function HomePage() {
  return (
    <>
      <IDEWorkspace />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
          },
        }}
      />
    </>
  );
}
