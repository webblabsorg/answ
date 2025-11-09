import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Common shortcuts for test-taking interface
export const testShortcuts = {
  NEXT: { key: 'n', description: 'Next question' },
  PREVIOUS: { key: 'p', description: 'Previous question' },
  FLAG: { key: 'f', description: 'Flag question' },
  SUBMIT: { key: 's', ctrlKey: true, description: 'Submit test (Ctrl+S)' },
  GRID: { key: 'g', description: 'Focus question grid' },
};
