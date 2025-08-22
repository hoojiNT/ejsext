/**
 * Unit tests for DocumentCacheManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DocumentCacheManager } from "./documentCache";
import { SymbolDefinition, ParsedEJSDocument, SymbolInfo } from "../types";

// Mock VS Code API
vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}));

describe("DocumentCacheManager", () => {
  let cacheManager: DocumentCacheManager;

  beforeEach(() => {
    cacheManager = new DocumentCacheManager();
  });

  afterEach(() => {
    cacheManager.dispose();
  });

  describe("Symbol Caching", () => {
    it("should cache and retrieve symbols correctly", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", [
        {
          name: "testVar",
          kind: "variable" as any,
          location: { line: 0, character: 0, length: 7 },
          definition: { line: 0, character: 0, length: 7 },
          references: [],
        },
      ]);

      // Cache symbols
      cacheManager.setSymbols("test://test.ejs", 1, symbols);

      // Retrieve symbols
      const retrieved = cacheManager.getSymbols("test://test.ejs", 1);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.get("testVar")).toEqual(symbols.get("testVar"));
    });

    it("should return null for non-existent cache entries", () => {
      const result = cacheManager.getSymbols("test://nonexistent.ejs", 1);
      expect(result).toBeNull();
    });

    it("should return null for outdated cache entries", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", [
        {
          name: "testVar",
          kind: "variable" as any,
          location: { line: 0, character: 0, length: 7 },
          definition: { line: 0, character: 0, length: 7 },
          references: [],
        },
      ]);

      // Cache with version 1
      cacheManager.setSymbols("test://test.ejs", 1, symbols);

      // Try to retrieve with version 2
      const result = cacheManager.getSymbols("test://test.ejs", 2);
      expect(result).toBeNull();
    });
  });

  describe("Parsed Document Caching", () => {
    it("should cache and retrieve parsed documents correctly", () => {
      const parsedDoc: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 0,
            endLine: 0,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      // Cache parsed document
      cacheManager.setParsedDocument("test://test.ejs", 1, parsedDoc);

      // Retrieve parsed document
      const retrieved = cacheManager.getParsedDocument("test://test.ejs", 1);
      expect(retrieved).toEqual(parsedDoc);
    });

    it("should return null for expired parsed documents", async () => {
      const parsedDoc: ParsedEJSDocument = {
        jsBlocks: [],
        symbols: [],
      };

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      // Cache document
      cacheManager.setParsedDocument("test://test.ejs", 1, parsedDoc);

      // Advance time beyond TTL (5 minutes = 300000ms)
      currentTime += 400000;

      // Should return null due to expiration
      const result = cacheManager.getParsedDocument("test://test.ejs", 1);
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("Performance Metrics", () => {
    it("should track cache hits and misses", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      // Cache miss
      cacheManager.getSymbols("test://test.ejs", 1);

      // Cache set
      cacheManager.setSymbols("test://test.ejs", 1, symbols);

      // Cache hit
      cacheManager.getSymbols("test://test.ejs", 1);

      const metrics = cacheManager.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    it("should record parse times correctly", () => {
      cacheManager.recordParseTime(100);
      cacheManager.recordParseTime(200);
      cacheManager.recordParseTime(300);

      const metrics = cacheManager.getPerformanceMetrics();
      expect(metrics.averageParseTime).toBe(200); // (100 + 200 + 300) / 3
      expect(metrics.maxParseTime).toBe(300);
    });

    it("should reset metrics correctly", () => {
      // Generate some metrics
      cacheManager.getSymbols("test://test.ejs", 1); // miss
      cacheManager.recordParseTime(150);

      // Reset
      cacheManager.resetPerformanceMetrics();

      const metrics = cacheManager.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.averageParseTime).toBe(0);
      expect(metrics.maxParseTime).toBe(0);
    });
  });

  describe("Symbol Index Creation", () => {
    it("should create optimized symbol index", () => {
      const symbols: SymbolInfo[] = [
        {
          name: "varA",
          kind: "variable" as any,
          location: { line: 2, character: 0, length: 4 },
          definition: { line: 2, character: 0, length: 4 },
          references: [],
        },
        {
          name: "varB",
          kind: "variable" as any,
          location: { line: 1, character: 0, length: 4 },
          definition: { line: 1, character: 0, length: 4 },
          references: [],
        },
        {
          name: "varA",
          kind: "variable" as any,
          location: { line: 0, character: 0, length: 4 },
          definition: { line: 0, character: 0, length: 4 },
          references: [],
        },
      ];

      const index = cacheManager.createSymbolIndex(symbols);

      expect(index.size).toBe(2);
      expect(index.get("varA")).toHaveLength(2);
      expect(index.get("varB")).toHaveLength(1);

      // Should be sorted by line number
      const varASymbols = index.get("varA")!;
      expect(varASymbols[0].definition.line).toBe(0);
      expect(varASymbols[1].definition.line).toBe(2);
    });
  });

  describe("Cache Management", () => {
    it("should clear specific document cache", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      cacheManager.setSymbols("test://test1.ejs", 1, symbols);
      cacheManager.setSymbols("test://test2.ejs", 1, symbols);

      // Clear specific document
      cacheManager.clearDocument("test://test1.ejs");

      expect(cacheManager.getSymbols("test://test1.ejs", 1)).toBeNull();
      expect(cacheManager.getSymbols("test://test2.ejs", 1)).toBeTruthy();
    });

    it("should clear all cache", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      cacheManager.setSymbols("test://test1.ejs", 1, symbols);
      cacheManager.setSymbols("test://test2.ejs", 1, symbols);

      // Clear all
      cacheManager.clearAll();

      expect(cacheManager.getSymbols("test://test1.ejs", 1)).toBeNull();
      expect(cacheManager.getSymbols("test://test2.ejs", 1)).toBeNull();
    });

    it("should provide cache statistics", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      cacheManager.setSymbols("test://test1.ejs", 1, symbols);
      cacheManager.setSymbols("test://test2.ejs", 1, symbols);

      // Generate some hits and misses
      cacheManager.getSymbols("test://test1.ejs", 1); // hit
      cacheManager.getSymbols("test://test3.ejs", 1); // miss

      const stats = cacheManager.getStats();
      expect(stats.size).toBe(2);
      expect(stats.documents).toContain("test://test1.ejs");
      expect(stats.documents).toContain("test://test2.ejs");
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 requests
    });
  });

  describe("Cache Eviction", () => {
    it("should handle cache size limits", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      // Fill cache beyond typical limits (assuming 100 is the limit)
      for (let i = 0; i < 120; i++) {
        cacheManager.setSymbols(`test://test${i}.ejs`, 1, symbols);
      }

      const stats = cacheManager.getStats();
      // Cache should not exceed reasonable limits
      expect(stats.size).toBeLessThanOrEqual(100);
    });
  });

  describe("Cleanup and Disposal", () => {
    it("should dispose cleanly", () => {
      const symbols = new Map<string, SymbolInfo[]>();
      symbols.set("testVar", []);

      cacheManager.setSymbols("test://test.ejs", 1, symbols);

      // Should not throw
      expect(() => cacheManager.dispose()).not.toThrow();

      // Cache should be cleared after disposal
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
    });
  });
});
