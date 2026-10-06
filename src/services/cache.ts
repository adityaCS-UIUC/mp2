import type { MarsRoverPhoto, NasaImageItem } from '../types/nasa'
import type { DetailState } from '../types/navigation'

type CacheableItem = NasaImageItem | MarsRoverPhoto
type CollectionKind = DetailState['kind']

interface CacheEntry {
  expiresAt: number
  kind: CollectionKind
  items: CacheableItem[]
}

const CACHE_PREFIX = 'nasa-cosmic-explorer:v1:'
const CACHE_DURATION_MS = 30 * 60 * 1000
const memoryCache = new Map<string, CacheEntry>()

function storageKey(scope: string): string {
  return `${CACHE_PREFIX}${scope}`
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<CacheEntry>
  return typeof candidate.expiresAt === 'number' &&
    (candidate.kind === 'library' || candidate.kind === 'rover') &&
    Array.isArray(candidate.items)
}

function readEntry(scope: string): CacheEntry | null {
  const key = storageKey(scope)
  const memoryEntry = memoryCache.get(key)

  if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry
  if (memoryEntry) memoryCache.delete(key)

  try {
    const storedValue = localStorage.getItem(key)
    if (!storedValue) return null

    const entry: unknown = JSON.parse(storedValue)
    if (!isCacheEntry(entry) || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(key)
      return null
    }

    memoryCache.set(key, entry)
    return entry
  } catch {
    return null
  }
}

export function getCachedCollection<T extends CacheableItem>(scope: string): T[] | null {
  return readEntry(scope)?.items as T[] | null
}

export function cacheCollection<T extends CacheableItem>(
  scope: string,
  kind: CollectionKind,
  items: T[],
): void {
  if (items.length === 0) return

  const key = storageKey(scope)
  const entry: CacheEntry = {
    expiresAt: Date.now() + CACHE_DURATION_MS,
    kind,
    items,
  }

  memoryCache.set(key, entry)

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // The in-memory copy still protects the current session.
  }
}

export function clearCachedCollection(scope: string): void {
  const key = storageKey(scope)
  memoryCache.delete(key)

  try {
    localStorage.removeItem(key)
  } catch {
    // Storage can be unavailable in privacy-focused browser modes.
  }
}

export function findCachedDetail(id: string): DetailState | null {
  const entries = new Map<string, CacheEntry>(memoryCache)

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(CACHE_PREFIX) || entries.has(key)) continue

      const storedValue = localStorage.getItem(key)
      if (!storedValue) continue

      const entry: unknown = JSON.parse(storedValue)
      if (isCacheEntry(entry) && entry.expiresAt > Date.now()) {
        entries.set(key, entry)
      }
    }
  } catch {
    // Continue with any entries already available in memory.
  }

  for (const entry of entries.values()) {
    const index = entry.items.findIndex((item) => item.id === id)
    if (index < 0) continue

    return entry.kind === 'library'
      ? { kind: 'library', items: entry.items as NasaImageItem[], index }
      : { kind: 'rover', items: entry.items as MarsRoverPhoto[], index }
  }

  return null
}
