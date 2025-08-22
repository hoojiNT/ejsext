/**
 * Unit tests for PerformanceMonitor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from './performanceMonitor';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn()
    }))
  }
}));

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      maxParseTime: 500,
      warningParseTime: 200,
      sampleSize: 10,
      enableLogging: false
    });
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('Operation Recording', () => {
    it('should record operation times correctly', () => {
      monitor.recordOperation('test-operation', 100);
      monitor.recordOperation('test-operation', 200);
      monitor.recordOperation('test-operation', 300);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(3);
      expect(metrics.rollingAverage).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should track slow operations', () => {
      monitor.recordOperation('slow-operation', 250); // Above warning threshold (200)
      monitor.recordOperation('fast-operation', 50);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.slowOperations).toBe(1);
      expect(metrics.timeoutOperations).toBe(0);
    });

    it('should track timeout operations', () => {
      monitor.recordOperation('timeout-operation', 600); // Above max threshold (500)
      monitor.recordOperation('normal-operation', 100);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.slowOperations).toBe(0);
      expect(metrics.timeoutOperations).toBe(1);
    });

    it('should maintain rolling window of operation times', () => {
      const sampleSize = 10;
      
      // Fill beyond sample size
      for (let i = 0; i < sampleSize + 5; i++) {
        monitor.recordOperation('test', i * 10);
      }

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(sampleSize + 5);
      
      // Rolling average should only consider last 10 operations
      // Last 10 operations: 50, 60, 70, 80, 90, 100, 110, 120, 130, 140
      const expectedAverage = (50 + 60 + 70 + 80 + 90 + 100 + 110 + 120 + 130 + 140) / 10;
      expect(metrics.rollingAverage).toBe(expectedAverage);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate percentiles correctly', () => {
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      times.forEach(time => {
        monitor.recordOperation('test', time);
      });

      const metrics = monitor.getDetailedMetrics();
      
      // 95th percentile of [10,20,30,40,50,60,70,80,90,100] 
      // Index calculation: Math.max(0, Math.floor(10 * 0.95) - 1) = Math.max(0, 9 - 1) = 8
      // So it should be the 8th element (0-indexed) which is 90
      expect(metrics.p95ResponseTime).toBe(90);
      
      // 99th percentile: Math.max(0, Math.floor(10 * 0.99) - 1) = Math.max(0, 9 - 1) = 8
      // So it should also be 90 for this small dataset
      expect(metrics.p99ResponseTime).toBe(90);
    });

    it('should handle empty metrics gracefully', () => {
      const metrics = monitor.getDetailedMetrics();
      
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.rollingAverage).toBe(0);
      expect(metrics.p95ResponseTime).toBe(0);
      expect(metrics.p99ResponseTime).toBe(0);
    });

    it('should reset metrics correctly', () => {
      monitor.recordOperation('test', 100);
      monitor.recordOperation('test', 600); // timeout
      
      let metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.timeoutOperations).toBe(1);
      
      monitor.resetMetrics();
      
      metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.timeoutOperations).toBe(0);
      expect(metrics.rollingAverage).toBe(0);
    });
  });

  describe('Performance Assessment', () => {
    it('should identify acceptable performance', () => {
      // All operations within limits
      monitor.recordOperation('test', 50);
      monitor.recordOperation('test', 100);
      monitor.recordOperation('test', 150);

      expect(monitor.isPerformanceAcceptable()).toBe(true);
    });

    it('should identify unacceptable performance due to high timeout rate', () => {
      // High timeout rate (more than 5%)
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation('test', 600); // All timeouts
      }

      expect(monitor.isPerformanceAcceptable()).toBe(false);
    });

    it('should identify unacceptable performance due to high average', () => {
      // High rolling average
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation('test', 250); // All above warning threshold
      }

      expect(monitor.isPerformanceAcceptable()).toBe(false);
    });

    it('should provide relevant recommendations', () => {
      // Create high timeout rate scenario
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation('test', 600);
      }

      const recommendations = monitor.getPerformanceRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('timeout rate'))).toBe(true);
    });

    it('should provide positive feedback for good performance', () => {
      // Good performance scenario
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation('test', 50);
      }

      const recommendations = monitor.getPerformanceRecommendations();
      expect(recommendations).toContain('Performance is within acceptable limits.');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customMonitor = new PerformanceMonitor({
        maxParseTime: 1000,
        warningParseTime: 500,
        sampleSize: 5
      });

      // Operation that would be timeout with default config but not with custom
      customMonitor.recordOperation('test', 600);

      const metrics = customMonitor.getDetailedMetrics();
      expect(metrics.slowOperations).toBe(1); // Above warning (500) but below max (1000)
      expect(metrics.timeoutOperations).toBe(0);

      customMonitor.dispose();
    });

    it('should enable and disable logging', () => {
      expect(() => {
        monitor.setLoggingEnabled(true);
        monitor.recordOperation('test', 100);
        monitor.setLoggingEnabled(false);
        monitor.recordOperation('test', 200);
      }).not.toThrow();
    });
  });

  describe('Memory Usage Estimation', () => {
    it('should estimate memory usage', () => {
      // Record some operations
      for (let i = 0; i < 50; i++) {
        monitor.recordOperation('test', i * 10);
      }

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.estimatedMemoryUsage).toBeGreaterThan(0);
      
      // Should be reasonable (not too high)
      expect(metrics.estimatedMemoryUsage).toBeLessThan(10 * 1024); // Less than 10KB
    });
  });

  describe('Edge Cases', () => {
    it('should handle single operation correctly', () => {
      monitor.recordOperation('single', 123);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.rollingAverage).toBe(123);
      expect(metrics.p95ResponseTime).toBe(123);
      expect(metrics.p99ResponseTime).toBe(123);
    });

    it('should handle zero duration operations', () => {
      monitor.recordOperation('zero', 0);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.rollingAverage).toBe(0);
      expect(metrics.slowOperations).toBe(0);
      expect(metrics.timeoutOperations).toBe(0);
    });

    it('should handle very large durations', () => {
      monitor.recordOperation('large', 10000);

      const metrics = monitor.getDetailedMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.timeoutOperations).toBe(1);
      expect(metrics.rollingAverage).toBe(10000);
      expect(metrics.p95ResponseTime).toBe(10000);
    });
  });
});