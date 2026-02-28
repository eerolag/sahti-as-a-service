import { useMemo, useState } from "react";

export function useBeerReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handlers = useMemo(
    () => ({
      onDragStart: (idx: number) => setDragIndex(idx),
      onDragOver: (idx: number) => {
        setOverIndex(idx);
      },
      onDrop: (idx: number) => {
        if (dragIndex == null || dragIndex === idx) {
          setDragIndex(null);
          setOverIndex(null);
          return;
        }

        const next = items.slice();
        const [moved] = next.splice(dragIndex, 1);
        next.splice(idx, 0, moved);
        onReorder(next);
        setDragIndex(null);
        setOverIndex(null);
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
    }),
    [dragIndex, items, onReorder],
  );

  return {
    dragIndex,
    overIndex,
    handlers,
  };
}
