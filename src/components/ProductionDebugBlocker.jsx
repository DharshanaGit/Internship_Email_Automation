'use client';

import { useEffect } from 'react';

/**
 * Production Security Guard:
 * Blocks browser developer tools, debugger code editor, inspection shortcuts,
 * and disables React DevTools hook in production environment.
 */
export default function ProductionDebugBlocker() {
  useEffect(() => {
    // Only enforce in production environments
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) return;

    // 1. Disable React Developer Tools hook
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      try {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () {};
        for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
          if (typeof value === 'function') {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = function () {};
          }
        }
      } catch {}
    }

    // 2. Block keyboard shortcuts that launch DevTools / code debugger
    const handleKeyDown = (e) => {
      // F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Inspector)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+S (Prevent script / page save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Block right-click context menu (Inspect Element) outside of form inputs
    const handleContextMenu = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    };

    // 4. Anti-debugger check to block code editor debugging in production
    let debugInterval;
    const blockDebugger = () => {
      try {
        const startTime = performance.now();
        (function () {}.constructor('debugger')());
        const endTime = performance.now();
        if (endTime - startTime > 100) {
          console.clear();
        }
      } catch {}
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    debugInterval = setInterval(blockDebugger, 2000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      if (debugInterval) clearInterval(debugInterval);
    };
  }, []);

  return null;
}
