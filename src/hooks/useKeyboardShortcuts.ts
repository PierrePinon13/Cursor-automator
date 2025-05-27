
import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsProps {
  onToggleSidebar?: () => void;
  onPreviousItem?: () => void;
  onNextItem?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onToggleSidebar,
  onPreviousItem,
  onNextItem,
  onEscape,
  enabled = true
}: UseKeyboardShortcutsProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore keyboard shortcuts when user is typing in an input or textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        onToggleSidebar?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onPreviousItem?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        onNextItem?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
    }
  }, [enabled, onToggleSidebar, onPreviousItem, onNextItem, onEscape]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
};
