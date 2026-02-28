export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!items.length) return;

  const concurrency = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  await Promise.all(
    Array.from({ length: concurrency }).map(async () => {
      while (true) {
        const currentIndex = cursor;
        cursor += 1;
        if (currentIndex >= items.length) return;
        await handler(items[currentIndex], currentIndex);
      }
    }),
  );
}
