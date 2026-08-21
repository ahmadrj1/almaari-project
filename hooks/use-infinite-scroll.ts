import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore?: () => void;
  onLoadPrevious?: () => void;
  hasMore?: boolean;
  hasPrevious?: boolean;
  isLoading: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll({
  onLoadMore,
  onLoadPrevious,
  hasMore = false,
  hasPrevious = false,
  isLoading,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleBottomIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading],
  );

  const handleTopIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasPrevious && !isLoading && onLoadPrevious) {
        onLoadPrevious();
      }
    },
    [onLoadPrevious, hasPrevious, isLoading],
  );

  useEffect(() => {
    const bottomSentinel = bottomSentinelRef.current;
    let observer: IntersectionObserver | null = null;
    if (bottomSentinel) {
      observer = new IntersectionObserver(handleBottomIntersect, { rootMargin });
      observer.observe(bottomSentinel);
    }
    return () => observer?.disconnect();
  }, [handleBottomIntersect, rootMargin]);

  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    let observer: IntersectionObserver | null = null;
    if (topSentinel) {
      observer = new IntersectionObserver(handleTopIntersect, { rootMargin });
      observer.observe(topSentinel);
    }
    return () => observer?.disconnect();
  }, [handleTopIntersect, rootMargin]);

  return { bottomSentinelRef, topSentinelRef };
}
