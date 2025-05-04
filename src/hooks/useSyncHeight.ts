import { useLayoutEffect, RefObject, useState, useEffect } from 'react';

interface SyncHeightOptions {
  maxHeight?: boolean;
  minHeight?: boolean;
  exactHeight?: boolean;
  syncOnResize?: boolean;
}

/**
 * Custom hook to synchronize heights between multiple elements
 * 
 * @param refs Array of refs to elements that need height synchronization
 * @param options Configuration options
 * @param deps Additional dependencies to trigger height recalculation
 */
export default function useSyncHeight(
  refs: RefObject<HTMLElement>[],
  options: SyncHeightOptions = {},
  deps: any[] = []
) {
  const {
    maxHeight = false,
    minHeight = false,
    exactHeight = true,
    syncOnResize = true
  } = options;

  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Handle window resize events
  useEffect(() => {
    if (!syncOnResize) return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [syncOnResize]);

  // Sync heights
  useLayoutEffect(() => {
    // Filter out null refs
    const elements = refs.filter(ref => ref.current !== null).map(ref => ref.current!);
    
    if (elements.length < 2) return;

    // Reset heights first for accurate measurement
    elements.forEach(element => {
      if (exactHeight) element.style.height = 'auto';
      if (minHeight) element.style.minHeight = 'auto';
      if (maxHeight) element.style.maxHeight = 'none';
    });

    // Find the tallest element
    let tallestHeight = 0;
    elements.forEach(element => {
      const height = element.offsetHeight;
      if (height > tallestHeight) {
        tallestHeight = height;
      }
    });

    // Apply the height to all elements
    elements.forEach(element => {
      if (exactHeight) element.style.height = `${tallestHeight}px`;
      if (minHeight) element.style.minHeight = `${tallestHeight}px`;
      if (maxHeight) element.style.maxHeight = `${tallestHeight}px`;
    });
  }, [refs, maxHeight, minHeight, exactHeight, ...deps, size.width]);
} 