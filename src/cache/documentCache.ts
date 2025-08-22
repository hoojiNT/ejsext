/**
 * Document cache for storing parsed symbols for performance optimization
 */

import { IDocumentCache } from '../interfaces';
import { DocumentCache, SymbolDefinition, SymbolInfo, ParsedEJSDocument } from '../types';
import { PerformanceMonitor } from './performanceMonitor';

/**
 * Performance metrics for monitoring cache effectiveness
 */
export interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  averageParseTime: number;
  maxParseTime: number;
  lastResetTime: number;
}

/**
 * Caches parsed document symbols to improve performance
 */
export class DocumentCacheManager implements IDocumentCache {
  private cache: Map<string, DocumentCache> = new Map();
  private parsedDocumentCache: Map<string, { version: number; document: ParsedEJSDocument; timestamp: number }> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageParseTime: 0,
    maxParseTime: 0,
    lastResetTime: Date.now()
  };
  private parseOperationCount: number = 0;
  private performanceMonitor: PerformanceMonitor;
  
  // Cache cleanup settings
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      maxParseTime: 500,
      warningParseTime: 200,
      enableLogging: false // Can be enabled via configuration
    });
    
    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Get cached symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @returns Cached symbols if available and up-to-date, null otherwise
   */
  getSymbols(uri: string, version: number): Map<string, SymbolInfo[]> | null {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    const cached = this.cache.get(uri);
    if (cached && cached.version === version) {
      this.performanceMetrics.cacheHits++;
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordOperation('cache-hit-symbols', duration, { uri, version });
      return cached.symbols;
    }
    
    this.performanceMetrics.cacheMisses++;
    const duration = Date.now() - startTime;
    this.performanceMonitor.recordOperation('cache-miss-symbols', duration, { uri, version });
    return null;
  }

  /**
   * Cache symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @param symbols Symbols to cache
   */
  setSymbols(uri: string, version: number, symbols: Map<string, SymbolInfo[]>): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntries();
    }

    this.cache.set(uri, {
      uri,
      version,
      symbols,
      lastParsed: Date.now()
    });
  }

  /**
   * Get cached parsed document
   * @param uri Document URI
   * @param version Document version
   * @returns Cached parsed document if available and up-to-date, null otherwise
   */
  getParsedDocument(uri: string, version: number): ParsedEJSDocument | null {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    const cached = this.parsedDocumentCache.get(uri);
    if (cached && cached.version === version && !this.isCacheExpired(cached.timestamp)) {
      this.performanceMetrics.cacheHits++;
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordOperation('cache-hit-document', duration, { uri, version });
      return cached.document;
    }
    
    this.performanceMetrics.cacheMisses++;
    const duration = Date.now() - startTime;
    this.performanceMonitor.recordOperation('cache-miss-document', duration, { uri, version });
    return null;
  }

  /**
   * Cache parsed document
   * @param uri Document URI
   * @param version Document version
   * @param document Parsed document to cache
   */
  setParsedDocument(uri: string, version: number, document: ParsedEJSDocument): void {
    // Enforce cache size limit
    if (this.parsedDocumentCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestParsedDocuments();
    }

    this.parsedDocumentCache.set(uri, {
      version,
      document,
      timestamp: Date.now()
    });
  }

  /**
   * Record parsing performance metrics
   * @param parseTime Time taken to parse in milliseconds
   */
  recordParseTime(parseTime: number): void {
    this.performanceMetrics.maxParseTime = Math.max(this.performanceMetrics.maxParseTime, parseTime);
    
    // Increment parse operation count
    this.parseOperationCount++;
    
    // Update average parse time using running average
    if (this.parseOperationCount === 1) {
      this.performanceMetrics.averageParseTime = parseTime;
    } else {
      this.performanceMetrics.averageParseTime = 
        (this.performanceMetrics.averageParseTime * (this.parseOperationCount - 1) + parseTime) / this.parseOperationCount;
    }
    
    // Record in performance monitor
    this.performanceMonitor.recordOperation('parse-operation', parseTime);
  }

  /**
   * Get performance metrics
   * @returns Current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageParseTime: 0,
      maxParseTime: 0,
      lastResetTime: Date.now()
    };
    this.parseOperationCount = 0;
  }

  /**
   * Clear cache for a specific document
   * @param uri Document URI
   */
  clearDocument(uri: string): void {
    this.cache.delete(uri);
    this.parsedDocumentCache.delete(uri);
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache.clear();
    this.parsedDocumentCache.clear();
  }

  /**
   * Get cache statistics for debugging
   * @returns Object with cache statistics
   */
  getStats(): { 
    size: number; 
    documents: string[]; 
    parsedDocuments: number;
    hitRate: number;
    performance: PerformanceMetrics;
  } {
    const hitRate = this.performanceMetrics.totalRequests > 0 
      ? this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests 
      : 0;

    // Update performance monitor with current cache hit rate
    const detailedMetrics = this.performanceMonitor.getDetailedMetrics();
    detailedMetrics.cacheHitRate = hitRate;

    return {
      size: this.cache.size,
      documents: Array.from(this.cache.keys()),
      parsedDocuments: this.parsedDocumentCache.size,
      hitRate,
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Create optimized symbol lookup index
   * @param symbols Array of symbols to index
   * @returns Map for fast symbol lookup
   */
  createSymbolIndex(symbols: SymbolInfo[]): Map<string, SymbolInfo[]> {
    const startTime = Date.now();
    const index = new Map<string, SymbolInfo[]>();
    
    for (const symbol of symbols) {
      if (!index.has(symbol.name)) {
        index.set(symbol.name, []);
      }
      index.get(symbol.name)!.push(symbol);
    }
    
    // Sort symbols by definition location for consistent ordering
    for (const [name, symbolList] of index) {
      symbolList.sort((a, b) => {
        if (a.definition.line !== b.definition.line) {
          return a.definition.line - b.definition.line;
        }
        return a.definition.character - b.definition.character;
      });
    }
    
    const duration = Date.now() - startTime;
    this.performanceMonitor.recordOperation('symbol-indexing', duration, { symbolCount: symbols.length });
    
    return index;
  }

  /**
   * Get performance monitor for advanced monitoring
   * @returns Performance monitor instance
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Enable or disable performance logging
   * @param enabled Whether to enable performance logging
   */
  setPerformanceLogging(enabled: boolean): void {
    this.performanceMonitor.setLoggingEnabled(enabled);
  }

  /**
   * Show detailed performance report
   */
  showPerformanceReport(): void {
    // Update cache hit rate in performance monitor
    const hitRate = this.performanceMetrics.totalRequests > 0 
      ? this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests 
      : 0;
    
    const detailedMetrics = this.performanceMonitor.getDetailedMetrics();
    detailedMetrics.cacheHitRate = hitRate;
    
    this.performanceMonitor.showPerformanceReport();
  }

  /**
   * Check if cache performance is acceptable
   * @returns True if performance is within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    return this.performanceMonitor.isPerformanceAcceptable();
  }

  /**
   * Get performance improvement recommendations
   * @returns Array of recommendations
   */
  getPerformanceRecommendations(): string[] {
    return this.performanceMonitor.getPerformanceRecommendations();
  }

  /**
   * Dispose of the cache manager and cleanup resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.performanceMonitor.dispose();
    this.clearAll();
  }

  /**
   * Check if cache entry is expired
   * @param timestamp Cache entry timestamp
   * @returns True if expired
   */
  private isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL_MS;
  }

  /**
   * Evict oldest cache entries when cache is full
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastParsed - b[1].lastParsed);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Evict oldest parsed document entries when cache is full
   */
  private evictOldestParsedDocuments(): void {
    const entries = Array.from(this.parsedDocumentCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.parsedDocumentCache.delete(entries[i][0]);
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Clean up parsed document cache
    for (const [uri, cached] of this.parsedDocumentCache) {
      if (this.isCacheExpired(cached.timestamp)) {
        this.parsedDocumentCache.delete(uri);
      }
    }
    
    // Clean up symbol cache (using TTL)
    for (const [uri, cached] of this.cache) {
      if (now - cached.lastParsed > this.CACHE_TTL_MS) {
        this.cache.delete(uri);
      }
    }
  }
}