/**
 * Fuzzy search utilities using fast-fuzzy.
 * Extracted from TUI for reuse in CLI.
 */
import { Searcher, MatchData, FullOptions } from "fast-fuzzy"

/**
 * A search candidate with an item and searchable text.
 */
export type SearchCandidate<T> = {
  item: T
  searchText: string
}

/**
 * A search result with the matched item and score.
 */
export type SearchResult<T> = {
  item: T
  score: number
}

/**
 * Options for fuzzy search.
 */
export type FuzzySearchOptions = {
  /** Maximum number of results to return (default: 200) */
  limit?: number
}

// Type for the searcher options with keySelector
type SearcherOptions<T> = FullOptions<SearchCandidate<T>> & {
  keySelector: (c: SearchCandidate<T>) => string
}

/**
 * Creates a fuzzy searcher for items with searchable text.
 *
 * @param candidates - Array of search candidates with items and search text
 * @returns A Searcher instance configured for the candidates
 */
export function createSearcher<T>(
  candidates: SearchCandidate<T>[]
): Searcher<SearchCandidate<T>, SearcherOptions<T>> {
  return new Searcher(candidates, {
    keySelector: (c: SearchCandidate<T>) => c.searchText,
  })
}

/**
 * Performs a fuzzy search on the given candidates.
 *
 * @param candidates - Array of search candidates
 * @param query - The search query string
 * @param options - Optional search options
 * @returns Array of search results sorted by score (descending)
 */
export function fuzzySearch<T>(
  candidates: SearchCandidate<T>[],
  query: string,
  options?: FuzzySearchOptions
): SearchResult<T>[] {
  const q = query.trim()
  if (!q) {
    // No query - return all items with score 1
    return candidates.map((c) => ({ item: c.item, score: 1 }))
  }

  const searcher = createSearcher(candidates)
  const results = searcher.search(q, { returnMatchData: true }) as MatchData<SearchCandidate<T>>[]

  const mapped: SearchResult<T>[] = results.map((match) => ({
    item: match.item.item,
    score: match.score,
  }))

  // Sort by score descending
  mapped.sort((a, b) => b.score - a.score)

  // Apply limit
  const limit = options?.limit ?? 200
  if (mapped.length > limit) {
    return mapped.slice(0, limit)
  }

  return mapped
}

/**
 * Performs fuzzy search and returns only the matched items (not scores).
 *
 * @param candidates - Array of search candidates
 * @param query - The search query string
 * @param options - Optional search options
 * @returns Array of matched items sorted by score (descending)
 */
export function fuzzySearchItems<T>(
  candidates: SearchCandidate<T>[],
  query: string,
  options?: FuzzySearchOptions
): T[] {
  return fuzzySearch(candidates, query, options).map((r) => r.item)
}

/**
 * Builds a search text string from multiple fields.
 * Joins all fields with spaces and normalizes whitespace.
 *
 * @param fields - Array of string fields to combine
 * @returns A normalized search text string
 */
export function buildSearchText(...fields: (string | null | undefined)[]): string {
  return fields
    .filter((f): f is string => f != null && f !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}
