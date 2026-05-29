import { describe, it, expect } from 'vitest'
import { sortStripsForMemoriesView } from '../bingoals/sortStrips'

type S = { id: string; done: boolean }
const isDone = (s: S) => s.done

describe('sortStripsForMemoriesView', () => {
  it('returns empty array unchanged', () => {
    expect(sortStripsForMemoriesView<S>([], null, isDone)).toEqual([])
  })

  it('preserves DB order when no running and no done', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: false },
      { id: 'c', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, null, isDone)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('floats the running sub to the top', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: false },
      { id: 'c', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, 'c', isDone)
    expect(out.map(s => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('sinks done subs to the bottom', () => {
    const subs: S[] = [
      { id: 'a', done: true },
      { id: 'b', done: false },
      { id: 'c', done: true },
      { id: 'd', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, null, isDone)
    expect(out.map(s => s.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('running sub wins even when done', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: true },
    ]
    const out = sortStripsForMemoriesView(subs, 'b', isDone)
    expect(out.map(s => s.id)).toEqual(['b', 'a'])
  })

  it('does not mutate input array', () => {
    const subs: S[] = [
      { id: 'a', done: true },
      { id: 'b', done: false },
    ]
    const copy = [...subs]
    sortStripsForMemoriesView(subs, null, isDone)
    expect(subs).toEqual(copy)
  })
})
