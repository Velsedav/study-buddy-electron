export function sortStripsForMemoriesView<S extends { id: string }>(
  subs: ReadonlyArray<S>,
  runningSubId: string | null,
  isDone: (s: S) => boolean
): S[] {
  return [...subs].sort((a, b) => {
    if (runningSubId === a.id && runningSubId !== b.id) return -1
    if (runningSubId === b.id && runningSubId !== a.id) return 1
    const aDone = isDone(a)
    const bDone = isDone(b)
    if (aDone !== bDone) return aDone ? 1 : -1
    return 0
  })
}
