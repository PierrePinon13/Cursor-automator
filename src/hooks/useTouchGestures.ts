
import { useEffect, useCallback, useRef } from 'react';

interface UseTouchGesturesProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export const useTouchGestures = ({
  onSwipeLeft,
  onSwipeRight,
  enabled = true
}: UseTouchGesturesProps) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isTwoFingerGesture = useRef<boolean>(false);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled) return;
    
    if (event.touches.length === 2) {
      isTwoFingerGesture.current = true;
      touchStartX.current = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      touchStartY.current = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      touchStartTime.current = Date.now();
    } else {
      isTwoFingerGesture.current = false;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enabled || !isTwoFingerGesture.current) return;
    
    if (event.changedTouches.length === 2) {
      const touchEndX = (event.changedTouches[0].clientX + event.changedTouches[1].clientX) / 2;
      const touchEndY = (event.changedTouches[0].clientY + event.changedTouches[1].clientY) / 2;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const deltaTime = touchEndTime - touchStartTime.current;
      
      // Check if it's a horizontal swipe (more horizontal than vertical movement)
      // and if it's fast enough and long enough
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 500) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    }
    
    isTwoFingerGesture.current = false;
  }, [enabled, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleTouchStart, handleTouchEnd, enabled]);
};
