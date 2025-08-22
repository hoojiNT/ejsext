/**
 * Performance tests for DocumentCacheManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { DocumentCacheManager } from './documentCache';
import { EJSParser } from '../parser/ejsParser';
import { SymbolAnalyzer } from '../analyzer/symbolAnalyzer';
import { EJSDefinitionProvider } from '../providers/definitionProvider';
import { EJSHoverProvider } from '../providers/hoverProvider';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn()
    }))
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Location: class {
    constructor(public uri: any, public range: any) {}
  },
  Hover: class {
    constructor(public contents: any, public range?: any) {}
  },
  MarkdownString: class {
    public isTrusted = false;
    public value = '';
    appendCodeblock(code: string, language?: string) {
      this.value += `\`\`\`${language || ''}\n${code}\n\`\`\`\n`;
    }
    appendMarkdown(text: string) {
      this.value += text;
    }
  }
}));

const mockDocument = {
  uri: { toString: () => 'test://test.ejs' },
  version: 1,
  languageId: 'ejs',
  getText: () => '',
  getWordRangeAtPosition: () => null
} as any;

describe('DocumentCacheManager Performance Tests', () => {
  let cacheManager: DocumentCacheManager;
  let parser: EJSParser;
  let symbolAnalyzer: SymbolAnalyzer;
  let definitionProvider: EJSDefinitionProvider;
  let hoverProvider: EJSHoverProvider;

  beforeEach(() => {
    cacheManager = new DocumentCacheManager();
    parser = new EJSParser();
    symbolAnalyzer = new SymbolAnalyzer();
    definitionProvider = new EJSDefinitionProvider(parser, symbolAnalyzer, cacheManager);
    hoverProvider = new EJSHoverProvider(parser, symbolAnalyzer, cacheManager);
  });

  afterEach(() => {
    cacheManager.dispose();
  });

  describe('Cache Performance', () => {
    it('should have fast cache hit performance', () => {
      const symbols = new Map();
      symbols.set('testVar', [{ name: 'testVar', definition: { line: 0, character: 0 } }]);
      
      // Cache the symbols
      cacheManager.setSymbols('test://test.ejs', 1, symbols);
      
      // Measure cache hit performance
      const startTime = Date.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const result = cacheManager.getSymbols('test://test.ejs', 1);
        expect(result).toBeTruthy();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;
      
      // Cache hits should be very fast (< 1ms average)
      expect(averageTime).toBeLessThan(1);
      console.log(`Cache hit average time: ${averageTime.toFixed(3)}ms`);
    });

    it('should handle large symbol sets efficiently', () => {
      // Create a large symbol set
      const symbols = new Map();
      const symbolCount = 1000;
      
      for (let i = 0; i < symbolCount; i++) {
        const symbolName = `variable${i}`;
        symbols.set(symbolName, [{
          name: symbolName,
          definition: { line: i, character: 0 },
          kind: 'variable'
        }]);
      }
      
      // Measure caching performance
      const startTime = Date.now();
      cacheManager.setSymbols('test://large.ejs', 1, symbols);
      const cacheTime = Date.now() - startTime;
      
      // Measure lookup performance
      const lookupStartTime = Date.now();
      const result = cacheManager.getSymbols('test://large.ejs', 1);
      const lookupTime = Date.now() - lookupStartTime;
      
      expect(result).toBeTruthy();
      expect(result!.size).toBe(symbolCount);
      
      // Both operations should be fast
      expect(cacheTime).toBeLessThan(50); // 50ms for caching 1000 symbols
      expect(lookupTime).toBeLessThan(10); // 10ms for lookup
      
      console.log(`Large symbol set cache time: ${cacheTime}ms, lookup time: ${lookupTime}ms`);
    });

    it('should maintain performance with cache eviction', () => {
      const maxCacheSize = 100; // Assuming this is the limit
      
      // Fill cache beyond capacity
      for (let i = 0; i < maxCacheSize + 20; i++) {
        const symbols = new Map();
        symbols.set(`var${i}`, [{ name: `var${i}`, definition: { line: 0, character: 0 } }]);
        
        const startTime = Date.now();
        cacheManager.setSymbols(`test://file${i}.ejs`, 1, symbols);
        const setTime = Date.now() - startTime;
        
        // Each set operation should be fast even with eviction
        expect(setTime).toBeLessThan(10);
      }
      
      const stats = cacheManager.getStats();
      console.log(`Cache stats after eviction: ${JSON.stringify(stats)}`);
    });
  });

  describe('Provider Performance with Cache', () => {
    it('should meet sub-500ms requirement for definition provider', async () => {
      // Create a large EJS document
      const largeEjsContent = generateLargeEjsDocument(1000);
      const document = {
        ...mockDocument,
        getText: () => largeEjsContent,
        getWordRangeAtPosition: () => ({ start: { line: 10, character: 5 }, end: { line: 10, character: 15 } })
      };
      
      const position = new vscode.Position(10, 10);
      const token = { isCancellationRequested: false } as vscode.CancellationToken;
      
      // First call (cache miss)
      const startTime1 = Date.now();
      const result1 = await definitionProvider.provideDefinition(document, position, token);
      const time1 = Date.now() - startTime1;
      
      // Second call (cache hit)
      const startTime2 = Date.now();
      const result2 = await definitionProvider.provideDefinition(document, position, token);
      const time2 = Date.now() - startTime2;
      
      // Both should be under 500ms, cache hit should be much faster
      expect(time1).toBeLessThan(500);
      expect(time2).toBeLessThan(500);
      expect(time2).toBeLessThan(time1); // Cache hit should be faster
      
      console.log(`Definition provider - First call: ${time1}ms, Second call: ${time2}ms`);
    });

    it('should meet sub-500ms requirement for hover provider', async () => {
      // Create a large EJS document
      const largeEjsContent = generateLargeEjsDocument(1000);
      const document = {
        ...mockDocument,
        getText: () => largeEjsContent,
        getWordRangeAtPosition: () => ({ start: { line: 10, character: 5 }, end: { line: 10, character: 15 } })
      };
      
      const position = new vscode.Position(10, 10);
      const token = { isCancellationRequested: false } as vscode.CancellationToken;
      
      // First call (cache miss)
      const startTime1 = Date.now();
      const result1 = await hoverProvider.provideHover(document, position, token);
      const time1 = Date.now() - startTime1;
      
      // Second call (cache hit)
      const startTime2 = Date.now();
      const result2 = await hoverProvider.provideHover(document, position, token);
      const time2 = Date.now() - startTime2;
      
      // Both should be under 500ms, cache hit should be much faster
      expect(time1).toBeLessThan(500);
      expect(time2).toBeLessThan(500);
      expect(time2).toBeLessThan(time1); // Cache hit should be faster
      
      console.log(`Hover provider - First call: ${time1}ms, Second call: ${time2}ms`);
    });

    it('should handle timeout gracefully', async () => {
      // Create a large document for performance testing
      const largeContent = generateLargeEjsDocument(5000);
      const document = {
        ...mockDocument,
        getText: () => largeContent,
        getWordRangeAtPosition: () => ({ start: { line: 100, character: 5 }, end: { line: 100, character: 15 } })
      };
      
      const position = new vscode.Position(100, 10);
      const token = { isCancellationRequested: false } as vscode.CancellationToken;
      
      const startTime = Date.now();
      const result = await definitionProvider.provideDefinition(document, position, token);
      const time = Date.now() - startTime;
      
      // Should complete reasonably fast with caching optimizations
      // Allow more time for first run without cache
      expect(time).toBeLessThan(1000); // 1 second max for large documents
      
      console.log(`Large document processing time: ${time}ms`);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics correctly', () => {
      // Reset metrics
      cacheManager.resetPerformanceMetrics();
      
      // Perform some operations
      const symbols = new Map();
      symbols.set('testVar', [{ name: 'testVar' }]);
      
      // Cache miss
      cacheManager.getSymbols('test://test.ejs', 1);
      
      // Cache set
      cacheManager.setSymbols('test://test.ejs', 1, symbols);
      
      // Cache hit
      cacheManager.getSymbols('test://test.ejs', 1);
      
      // Record parse times
      cacheManager.recordParseTime(100);
      cacheManager.recordParseTime(200);
      
      const metrics = cacheManager.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.averageParseTime).toBe(150); // (100 + 200) / 2
      expect(metrics.maxParseTime).toBe(200);
      
      console.log('Performance metrics:', metrics);
    });

    it('should calculate hit rate correctly', () => {
      cacheManager.resetPerformanceMetrics();
      
      const symbols = new Map();
      symbols.set('testVar', [{ name: 'testVar' }]);
      cacheManager.setSymbols('test://test.ejs', 1, symbols);
      
      // 3 hits, 2 misses
      cacheManager.getSymbols('test://test.ejs', 1); // hit
      cacheManager.getSymbols('test://test.ejs', 1); // hit
      cacheManager.getSymbols('test://test.ejs', 1); // hit
      cacheManager.getSymbols('test://other.ejs', 1); // miss
      cacheManager.getSymbols('test://another.ejs', 1); // miss
      
      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBeCloseTo(0.6); // 3/5 = 0.6
      
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    });
  });
});

/**
 * Generate a large EJS document for performance testing
 * @param lines Number of lines to generate
 * @returns Large EJS content string
 */
function generateLargeEjsDocument(lines: number): string {
  const ejsLines: string[] = [];
  
  // Add some initial variable definitions
  ejsLines.push('<% const baseUrl = "/api/v1"; %>');
  ejsLines.push('<% let userCount = 0; %>');
  ejsLines.push('<% var isActive = true; %>');
  
  for (let i = 0; i < lines; i++) {
    if (i % 10 === 0) {
      // Add variable definitions periodically
      ejsLines.push(`<% const variable${i} = "value${i}"; %>`);
    } else if (i % 7 === 0) {
      // Add variable usage
      ejsLines.push(`<%= variable${Math.floor(i / 10) * 10} %>`);
    } else if (i % 5 === 0) {
      // Add unescaped output
      ejsLines.push(`<%- baseUrl + "/users" %>`);
    } else {
      // Add regular HTML
      ejsLines.push(`<div class="line-${i}">Content for line ${i}</div>`);
    }
  }
  
  return ejsLines.join('\n');
}