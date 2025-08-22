/**
 * Performance monitoring utility for EJS Go to Definition functionality
 */

import * as vscode from 'vscode';

/**
 * Performance thresholds and monitoring configuration
 */
export interface PerformanceConfig {
  /** Maximum allowed parse time in milliseconds */
  maxParseTime: number;
  /** Warning threshold for parse time in milliseconds */
  warningParseTime: number;
  /** Maximum allowed definition lookup time in milliseconds */
  maxLookupTime: number;
  /** Sample size for rolling average calculations */
  sampleSize: number;
  /** Enable performance logging to output channel */
  enableLogging: boolean;
}

/**
 * Performance metrics for monitoring system health
 */
export interface DetailedPerformanceMetrics {
  /** Total number of operations performed */
  totalOperations: number;
  /** Number of operations that exceeded warning threshold */
  slowOperations: number;
  /** Number of operations that exceeded maximum threshold */
  timeoutOperations: number;
  /** Rolling average of recent operation times */
  rollingAverage: number;
  /** 95th percentile response time */
  p95ResponseTime: number;
  /** 99th percentile response time */
  p99ResponseTime: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
  /** Memory usage estimate in bytes */
  estimatedMemoryUsage: number;
  /** Last reset timestamp */
  lastResetTime: number;
}

/**
 * Performance monitoring and alerting system
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private operationTimes: number[] = [];
  private slowOperationCount = 0;
  private timeoutOperationCount = 0;
  private totalOperationCount = 0;
  private outputChannel: vscode.OutputChannel;
  private lastResetTime = Date.now();

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      maxParseTime: 500,
      warningParseTime: 200,
      maxLookupTime: 100,
      sampleSize: 100,
      enableLogging: false,
      ...config
    };

    this.outputChannel = vscode.window.createOutputChannel('EJS Performance Monitor');
  }

  /**
   * Record an operation time and check for performance issues
   * @param operationType Type of operation (parse, lookup, etc.)
   * @param duration Duration in milliseconds
   * @param context Additional context for logging
   */
  recordOperation(operationType: string, duration: number, context?: any): void {
    this.totalOperationCount++;
    
    // Add to rolling window
    this.operationTimes.push(duration);
    if (this.operationTimes.length > this.config.sampleSize) {
      this.operationTimes.shift();
    }

    // Check thresholds
    if (duration > this.config.maxParseTime) {
      this.timeoutOperationCount++;
      this.logPerformanceIssue('TIMEOUT', operationType, duration, context);
    } else if (duration > this.config.warningParseTime) {
      this.slowOperationCount++;
      this.logPerformanceIssue('SLOW', operationType, duration, context);
    }

    // Log successful operations if detailed logging is enabled
    if (this.config.enableLogging && duration <= this.config.warningParseTime) {
      this.logOperation('SUCCESS', operationType, duration, context);
    }
  }

  /**
   * Get detailed performance metrics
   * @returns Comprehensive performance metrics
   */
  getDetailedMetrics(): DetailedPerformanceMetrics {
    const sortedTimes = [...this.operationTimes].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.floor(sortedTimes.length * 0.95) - 1);
    const p99Index = Math.max(0, Math.floor(sortedTimes.length * 0.99) - 1);
    
    const rollingAverage = this.operationTimes.length > 0
      ? this.operationTimes.reduce((sum, time) => sum + time, 0) / this.operationTimes.length
      : 0;

    const maxTime = this.operationTimes.length > 0 
      ? Math.max(...this.operationTimes)
      : 0;

    return {
      totalOperations: this.totalOperationCount,
      slowOperations: this.slowOperationCount,
      timeoutOperations: this.timeoutOperationCount,
      rollingAverage,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      cacheHitRate: 0, // Will be set by cache manager
      estimatedMemoryUsage: this.estimateMemoryUsage(),
      lastResetTime: this.lastResetTime
    };
  }

  /**
   * Check if system is performing within acceptable limits
   * @returns True if performance is acceptable
   */
  isPerformanceAcceptable(): boolean {
    const metrics = this.getDetailedMetrics();
    
    // Check if timeout rate is too high (more than 5% of operations)
    const timeoutRate = metrics.totalOperations > 0 
      ? metrics.timeoutOperations / metrics.totalOperations 
      : 0;
    
    if (timeoutRate > 0.05) {
      return false;
    }

    // Check if rolling average is too high
    if (metrics.rollingAverage > this.config.warningParseTime) {
      return false;
    }

    // Check if 95th percentile is too high
    if (metrics.p95ResponseTime > this.config.maxParseTime) {
      return false;
    }

    return true;
  }

  /**
   * Get performance recommendations based on current metrics
   * @returns Array of performance improvement recommendations
   */
  getPerformanceRecommendations(): string[] {
    const metrics = this.getDetailedMetrics();
    const recommendations: string[] = [];

    const timeoutRate = metrics.totalOperations > 0 
      ? metrics.timeoutOperations / metrics.totalOperations 
      : 0;

    if (timeoutRate > 0.1) {
      recommendations.push('High timeout rate detected. Consider increasing cache size or optimizing parsing logic.');
    }

    if (metrics.rollingAverage > this.config.warningParseTime) {
      recommendations.push('Average response time is high. Check for large files or complex EJS templates.');
    }

    if (metrics.cacheHitRate > 0 && metrics.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate. Consider increasing cache TTL or size.');
    }

    if (metrics.estimatedMemoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected. Consider reducing cache size or implementing more aggressive cleanup.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits.');
    }

    return recommendations;
  }

  /**
   * Reset all performance metrics
   */
  resetMetrics(): void {
    this.operationTimes = [];
    this.slowOperationCount = 0;
    this.timeoutOperationCount = 0;
    this.totalOperationCount = 0;
    this.lastResetTime = Date.now();
    
    if (this.config.enableLogging) {
      this.outputChannel.appendLine(`[${new Date().toISOString()}] Performance metrics reset`);
    }
  }

  /**
   * Enable or disable performance logging
   * @param enabled Whether to enable logging
   */
  setLoggingEnabled(enabled: boolean): void {
    this.config.enableLogging = enabled;
    
    if (enabled) {
      this.outputChannel.appendLine(`[${new Date().toISOString()}] Performance logging enabled`);
      this.outputChannel.show(true);
    }
  }

  /**
   * Show performance report in output channel
   */
  showPerformanceReport(): void {
    const metrics = this.getDetailedMetrics();
    const recommendations = this.getPerformanceRecommendations();
    
    this.outputChannel.clear();
    this.outputChannel.appendLine('=== EJS Go to Definition Performance Report ===');
    this.outputChannel.appendLine(`Generated: ${new Date().toISOString()}`);
    this.outputChannel.appendLine('');
    
    this.outputChannel.appendLine('Performance Metrics:');
    this.outputChannel.appendLine(`  Total Operations: ${metrics.totalOperations}`);
    this.outputChannel.appendLine(`  Slow Operations: ${metrics.slowOperations} (${((metrics.slowOperations / metrics.totalOperations) * 100).toFixed(1)}%)`);
    this.outputChannel.appendLine(`  Timeout Operations: ${metrics.timeoutOperations} (${((metrics.timeoutOperations / metrics.totalOperations) * 100).toFixed(1)}%)`);
    this.outputChannel.appendLine(`  Rolling Average: ${metrics.rollingAverage.toFixed(2)}ms`);
    this.outputChannel.appendLine(`  95th Percentile: ${metrics.p95ResponseTime.toFixed(2)}ms`);
    this.outputChannel.appendLine(`  99th Percentile: ${metrics.p99ResponseTime.toFixed(2)}ms`);
    this.outputChannel.appendLine(`  Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    this.outputChannel.appendLine(`  Estimated Memory Usage: ${(metrics.estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    this.outputChannel.appendLine('');
    
    this.outputChannel.appendLine('Recommendations:');
    recommendations.forEach(rec => {
      this.outputChannel.appendLine(`  • ${rec}`);
    });
    
    this.outputChannel.show();
  }

  /**
   * Dispose of the performance monitor
   */
  dispose(): void {
    this.outputChannel.dispose();
  }

  /**
   * Log a performance issue
   * @param level Issue level (SLOW, TIMEOUT)
   * @param operationType Type of operation
   * @param duration Duration in milliseconds
   * @param context Additional context
   */
  private logPerformanceIssue(level: string, operationType: string, duration: number, context?: any): void {
    if (!this.config.enableLogging) {
      return;
    }

    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    
    this.outputChannel.appendLine(
      `[${timestamp}] ${level}: ${operationType} took ${duration}ms${contextStr}`
    );

    // Show output channel for timeout issues
    if (level === 'TIMEOUT') {
      this.outputChannel.show(true);
    }
  }

  /**
   * Log a successful operation
   * @param level Log level
   * @param operationType Type of operation
   * @param duration Duration in milliseconds
   * @param context Additional context
   */
  private logOperation(level: string, operationType: string, duration: number, context?: any): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    
    this.outputChannel.appendLine(
      `[${timestamp}] ${level}: ${operationType} completed in ${duration}ms${contextStr}`
    );
  }

  /**
   * Estimate memory usage of the performance monitor
   * @returns Estimated memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: each operation time is 8 bytes (number)
    // Plus overhead for arrays and objects
    const operationTimesSize = this.operationTimes.length * 8;
    const overhead = 1024; // Rough estimate for object overhead
    
    return operationTimesSize + overhead;
  }
}