import { useEffect, useRef, RefObject } from 'react';

interface UseSwipeMenuProps {
  menuOuvert: boolean;
  setMenuOuvert: (open: boolean) => void;
  sidebarRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  sidebarWidth: number;
}

export function useSwipeMenu({
  menuOuvert,
  setMenuOuvert,
  sidebarRef,
  overlayRef,
  sidebarWidth,
}: UseSwipeMenuProps) {
  // Use refs for state to avoid re-binding event listeners on every toggle
  const menuOuvertRef = useRef(menuOuvert);
  
  useEffect(() => {
    menuOuvertRef.current = menuOuvert;
  }, [menuOuvert]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let currentX = 0;
    
    // Gesture tracking state
    let isDragging = false;
    let dragDirection: 'horizontal' | 'vertical' | null = null;
    let initialMenuState = false;

    // Smart prevention logic
    const isSwipePrevented = (target: HTMLElement) => {
      // Editable elements
      const tag = target.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return true;
      if (target.isContentEditable) return true;
      
      // Bottom sheets, modals, specific components with native gestures
      let current: HTMLElement | null = target;
      while (current && current !== document.body) {
        // Exclude specific UI elements
        if (
          current.hasAttribute('data-no-swipe') || 
          current.getAttribute('role') === 'dialog' || 
          current.classList.contains('bottom-sheet') ||
          // Usually drag-and-drop components have draggable="true"
          current.getAttribute('draggable') === 'true'
        ) {
          return true;
        }
        
        // Detect native horizontal scroll containers (tables, carousels)
        const style = window.getComputedStyle(current);
        if (
          (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.display === 'flex' || style.whiteSpace === 'nowrap') 
          && current.scrollWidth > current.clientWidth
        ) {
          return true;
        }

        current = current.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Only 1 finger
      
      const target = e.target as HTMLElement;
      if (isSwipePrevented(target)) return;

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = startX;
      startTime = Date.now();
      
      isDragging = false;
      dragDirection = null;
      initialMenuState = menuOuvertRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Interrupt if multi-touch
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - startX;
      const deltaY = touchY - startY;

      // Too little movement, ignore for now
      if (!dragDirection && !isDragging && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        return;
      }

      // Directional Lock (evaluate once per swipe)
      if (!dragDirection) {
        // Strong horizontal dominance required (1.2x ratio)
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && Math.abs(deltaX) > 10) {
          // Check if swipe direction makes sense for the menu state
          if ((!initialMenuState && deltaX > 0) || (initialMenuState && deltaX < 0)) {
            dragDirection = 'horizontal';
          } else {
             // Swipe left when closed, or swipe right when open -> let browser handle (e.g., iOS back swipe)
             dragDirection = 'vertical'; 
          }
        } else if (Math.abs(deltaY) > 10) {
          // It's a vertical scroll
          dragDirection = 'vertical';
        }
      }

      if (dragDirection === 'vertical') return;

      if (dragDirection === 'horizontal') {
        isDragging = true;
        
        // Take control, prevent native scrolling and native gestures
        if (e.cancelable) {
          e.preventDefault(); 
        }

        // Calculate direct visual offset
        let offset = 0;
        if (initialMenuState) {
          // Open (0px) -> swiping left goes to negative
          offset = Math.min(0, Math.max(-sidebarWidth, deltaX));
        } else {
          // Closed (-sidebarWidth) -> swiping right goes towards 0
          offset = Math.min(0, Math.max(-sidebarWidth, -sidebarWidth + deltaX));
        }

        currentX = touchX;

        // Direct DOM manipulation for 60/120fps (bypass React renders)
        if (sidebarRef.current) {
          // Disable CSS transitions during drag for instant follow
          sidebarRef.current.style.transition = 'none';
          sidebarRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
        }
        
        if (overlayRef.current) {
          const progress = 1 - Math.abs(offset) / sidebarWidth;
          overlayRef.current.style.transition = 'none';
          overlayRef.current.style.opacity = progress.toString();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (dragDirection !== 'horizontal' || !isDragging) return;

      const deltaX = currentX - startX;
      const deltaTime = Date.now() - startTime;
      const velocityX = deltaX / deltaTime;

      let shouldOpen = initialMenuState;

      // Smart threshold: distance OR velocity
      if (!initialMenuState) {
        // Opening (swiped right)
        if (deltaX > sidebarWidth / 3 || velocityX > 0.4) {
          shouldOpen = true;
        }
      } else {
        // Closing (swiped left)
        if (deltaX < -sidebarWidth / 3 || velocityX < -0.4) {
          shouldOpen = false;
        }
      }

      // Cleanup inline styles immediately before React re-renders with classes
      if (sidebarRef.current) {
         sidebarRef.current.style.transform = '';
         sidebarRef.current.style.transition = '';
      }
      if (overlayRef.current) {
         overlayRef.current.style.opacity = '';
         overlayRef.current.style.transition = '';
      }

      isDragging = false;
      dragDirection = null;

      // Update functional state
      if (shouldOpen !== initialMenuState) {
        setMenuOuvert(shouldOpen);
      }
    };

    // Passive false is required to allow e.preventDefault() during touchmove
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setMenuOuvert, sidebarRef, overlayRef, sidebarWidth]);
}
