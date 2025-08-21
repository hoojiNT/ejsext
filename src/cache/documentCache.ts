/**
 * Document cache for storing parsed symbols for performance optimization
 */

import { IDocumentCache } from '../interfaces';
import { DocumentCache, SymbolDefinition } from '../types';

/**
 * Caches parsed document symbols to improve performance
 */
export class DocumentCacheManager implements IDocumentCache {
  private cache: Map<string, DocumentCache> = new Map();

  /**
   * Get cached symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @returns Cached symbols if available and up-to-date, null otherwise
   */
  getSymbols(uri: string, version: number): Map<string, SymbolDefinition[]> | null {
    const cached = this.cache.get(uri);
    if (cached && cached.version === version) {
      return cached.symbols;
    }
    return null;
  }

  /**
   * Cache symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @param symbols Symbols to cache
   */
  setSymbols(uri: string, version: number, symbols: Map<string, SymbolDefinition[]>): void {
    this.cache.set(uri, {
      uri,
      version,
      symbols,
      lastParsed: Date.now()
    });
  }

  /**
   * Clear cache for a specific document
   * @param uri Document URI
   */
  clearDocument(uri: string): void {
    this.cache.delete(uri);
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   * @returns Object with cache statistics
   */
  getStats(): { size: number; documents: string[] } {
    return {
      size: this.cache.size,
      documents: Array.from(this.cache.keys())
    };
  }
}