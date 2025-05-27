
import { useEffect, useCallback, useRef } from 'react';

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
  
  // Use refs to store the latest callback functions
  const onToggleSidebarRef = useRef(onToggleSidebar);
  const onPreviousItemRef = useRef(onPreviousItem);
  const onNextItemRef = useRef(onNextItem);
  const onEscapeRef = useRef(onEscape);

  // Update refs when callbacks change
  onToggleSidebarRef.current = onToggleSidebar;
  onPreviousItemRef.current = onPreviousItem;
  onNextItemRef.current = onNextItem;
  onEscapeRef.current = onEscape;
  
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
        onToggleSidebarRef.current?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onPreviousItemRef.current?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        onNextItemRef.current?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscapeRef.current?.();
        break;
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
};
