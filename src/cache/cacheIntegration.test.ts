/**
 * Integration tests for cache performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DocumentCacheManager } from "./documentCache";
import { PerformanceMonitor } from "./performanceMonitor";
import { SymbolInfo, SymbolKind } from "../types";

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

describe("Cache Performance Integration Tests", () => {
  let cacheManager: DocumentCacheManager;

  beforeEach(() => {
    cacheManager = new DocumentCacheManager();
  });

  afterEach(() => {
    cacheManager.dispose();
  });

  describe("Performance Monitoring Integration", () => {
    it("should track all cache operations with performance monitoring", () => {
      const symbols = new Map();
      symbols.set("testVar", [
        { name: "testVar", definition: { line: 0, character: 0 } },
      ]);

      // Perform cache operations
      cacheManager.setSymbols("test://test.ejs", 1, symbols);
      cacheManager.getSymbols("test://test.ejs", 1); // hit
      cacheManager.getSymbols("test://nonexistent.ejs", 1); // miss

      // Record some parse times
      cacheManager.recordParseTime(100);
      cacheManager.recordParseTime(250); // slow operation
      cacheManager.recordParseTime(600); // timeout operation

      const performanceMonitor = cacheManager.getPerformanceMonitor();
      const metrics = performanceMonitor.getDetailedMetrics();

      // Should have recorded all operations
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.slowOperations).toBe(1); // 250ms operation
      expect(metrics.timeoutOperations).toBe(1); // 600ms operation
    });

    it("should provide performance recommendations based on cache behavior", () => {
      // Create scenario with poor performance
      for (let i = 0; i < 10; i++) {
        cacheManager.recordParseTime(700); // All timeout operations
      }

      const recommendations = cacheManager.getPerformanceRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((rec) => rec.includes("timeout rate"))).toBe(
        true
      );
    });

    it("should identify good performance correctly", () => {
      // Create scenario with good performance
      const symbols = new Map();
      symbols.set("testVar", [{ name: "testVar" }]);

      // High cache hit rate
      cacheManager.setSymbols("test://test.ejs", 1, symbols);
      for (let i = 0; i < 10; i++) {
        cacheManager.getSymbols("test://test.ejs", 1); // All hits
        cacheManager.recordParseTime(50); // All fast operations
      }

      expect(cacheManager.isPerformanceAcceptable()).toBe(true);

      const recommendations = cacheManager.getPerformanceRecommendations();
      expect(recommendations).toContain(
        "Performance is within acceptable limits."
      );
    });

    it("should enable and disable performance logging", () => {
      expect(() => {
        cacheManager.setPerformanceLogging(true);
        cacheManager.recordParseTime(100);
        cacheManager.setPerformanceLogging(false);
        cacheManager.recordParseTime(200);
      }).not.toThrow();
    });

    it("should show performance report without errors", () => {
      // Generate some metrics
      cacheManager.recordParseTime(100);
      cacheManager.recordParseTime(200);

      expect(() => {
        cacheManager.showPerformanceReport();
      }).not.toThrow();
    });
  });

  describe("Cache Optimization Features", () => {
    it("should maintain performance with large datasets", () => {
      const startTime = Date.now();

      // Create large symbol sets
      for (let fileIndex = 0; fileIndex < 50; fileIndex++) {
        const symbols = new Map();

        // 100 symbols per file
        for (let symbolIndex = 0; symbolIndex < 100; symbolIndex++) {
          const symbolName = `var${fileIndex}_${symbolIndex}`;
          symbols.set(symbolName, [
            {
              name: symbolName,
              definition: { line: symbolIndex, character: 0 },
              kind: "variable",
            },
          ]);
        }

        cacheManager.setSymbols(`test://file${fileIndex}.ejs`, 1, symbols);
      }

      const cacheTime = Date.now() - startTime;

      // Should complete within reasonable time
      expect(cacheTime).toBeLessThan(1000); // 1 second for 5000 symbols

      // Verify cache stats
      const stats = cacheManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(100); // Should respect cache size limit
    });

    it("should optimize symbol indexing performance", () => {
      // Create large symbol array
      const symbols: SymbolInfo[] = [];
      for (let i = 0; i < 1000; i++) {
        symbols.push({
          name: `symbol${i}`,
          definition: { line: i, character: 0, length: 10 },
          kind: SymbolKind.Variable,
          location: { line: i, character: 0, length: 10 },
          references: [],
        });
      }

      const startTime = Date.now();
      const index = cacheManager.createSymbolIndex(symbols);
      const indexTime = Date.now() - startTime;

      // Should be fast
      expect(indexTime).toBeLessThan(100); // 100ms for 1000 symbols

      // Should create correct index
      expect(index.size).toBe(1000);
      expect(index.get("symbol500")).toBeDefined();
      expect(index.get("symbol500")![0].definition.line).toBe(500);
    });

    it("should handle cache eviction gracefully", () => {
      const maxCacheSize = 100;

      // Fill cache beyond capacity
      for (let i = 0; i < maxCacheSize + 20; i++) {
        const symbols = new Map();
        symbols.set(`var${i}`, [{ name: `var${i}` }]);

        const startTime = Date.now();
        cacheManager.setSymbols(`test://file${i}.ejs`, 1, symbols);
        const setTime = Date.now() - startTime;

        // Each operation should remain fast even with eviction
        expect(setTime).toBeLessThan(50);
      }

      const stats = cacheManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxCacheSize);
    });

    it("should maintain cache consistency during concurrent operations", () => {
      const symbols1 = new Map();
      symbols1.set("var1", [
        { name: "var1", definition: { line: 0, character: 0 } },
      ]);

      const symbols2 = new Map();
      symbols2.set("var2", [
        { name: "var2", definition: { line: 1, character: 0 } },
      ]);

      // Simulate concurrent operations
      cacheManager.setSymbols("test://file1.ejs", 1, symbols1);
      cacheManager.setSymbols("test://file2.ejs", 1, symbols2);

      const result1 = cacheManager.getSymbols("test://file1.ejs", 1);
      const result2 = cacheManager.getSymbols("test://file2.ejs", 1);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(result1!.get("var1")).toBeDefined();
      expect(result2!.get("var2")).toBeDefined();

      // Should not interfere with each other
      expect(result1!.get("var2")).toBeUndefined();
      expect(result2!.get("var1")).toBeUndefined();
    });
  });

  describe("Memory Management", () => {
    it("should clean up expired entries automatically", async () => {
      const symbols = new Map();
      symbols.set("testVar", [{ name: "testVar" }]);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      // Cache some documents
      cacheManager.setParsedDocument("test://test1.ejs", 1, {
        jsBlocks: [],
        symbols: [],
      });
      cacheManager.setParsedDocument("test://test2.ejs", 1, {
        jsBlocks: [],
        symbols: [],
      });

      // Advance time beyond TTL (5 minutes)
      currentTime += 6 * 60 * 1000;

      // Trigger cleanup by trying to access
      const result = cacheManager.getParsedDocument("test://test1.ejs", 1);
      expect(result).toBeNull(); // Should be expired

      // Restore Date.now
      Date.now = originalNow;
    });

    it("should provide accurate memory usage estimates", () => {
      const performanceMonitor = cacheManager.getPerformanceMonitor();

      // Record some operations to generate data
      for (let i = 0; i < 50; i++) {
        performanceMonitor.recordOperation("test", i * 10);
      }

      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics.estimatedMemoryUsage).toBeGreaterThan(0);
      expect(metrics.estimatedMemoryUsage).toBeLessThan(10 * 1024); // Should be reasonable
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle null and undefined values gracefully", () => {
      expect(() => {
        cacheManager.getSymbols("", 0);
        cacheManager.getParsedDocument("", 0);
        cacheManager.clearDocument("");
      }).not.toThrow();
    });

    it("should handle very large parse times", () => {
      expect(() => {
        cacheManager.recordParseTime(Number.MAX_SAFE_INTEGER);
        cacheManager.recordParseTime(0);
        cacheManager.recordParseTime(-1);
      }).not.toThrow();

      const stats = cacheManager.getStats();
      expect(stats.performance.maxParseTime).toBeGreaterThan(0);
    });

    it("should maintain performance metrics consistency", () => {
      const initialMetrics = cacheManager.getPerformanceMetrics();

      // Perform operations
      cacheManager.recordParseTime(100);
      cacheManager.recordParseTime(200);

      const updatedMetrics = cacheManager.getPerformanceMetrics();

      expect(updatedMetrics.averageParseTime).toBeGreaterThan(
        initialMetrics.averageParseTime
      );
      expect(updatedMetrics.maxParseTime).toBeGreaterThanOrEqual(
        initialMetrics.maxParseTime
      );
    });
  });
});
