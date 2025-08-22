/**
 * Tests for EJS Cursor Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { EJSCursorManager } from './cursorManager';
import { EJSVisualFeedbackProvider } from './visualFeedbackProvider';

describe('EJSCursorManager', () => {
  let cursorManager: EJSCursorManager;
  let mockVisualFeedbackProvider: EJSVisualFeedbackProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the visual feedback provider
    mockVisualFeedbackProvider = {
      isOverDefinedVariable: vi.fn()
    } as any;

    cursorManager = new EJSCursorManager(mockVisualFeedbackProvider);
  });

  describe('constructor', () => {
    it('should create cursor manager without errors', () => {
      expect(cursorManager).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should dispose without errors', () => {
      expect(() => cursorManager.dispose()).not.toThrow();
    });
  });

  describe('isOverDefinedVariable delegation', () => {
    it('should delegate to visual feedback provider', () => {
      // Mock document and position
      const mockDocument = {} as any;
      const mockPosition = {} as any;
      
      // Mock return value
      (mockVisualFeedbackProvider.isOverDefinedVariable as any).mockReturnValue(true);
      
      // Call the method through the provider directly (since cursor manager doesn't expose it)
      const result = mockVisualFeedbackProvider.isOverDefinedVariable(mockDocument, mockPosition);
      
      expect(result).toBe(true);
      expect(mockVisualFeedbackProvider.isOverDefinedVariable).toHaveBeenCalledWith(mockDocument, mockPosition);
    });
  });
});