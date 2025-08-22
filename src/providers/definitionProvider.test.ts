/**
 * Unit tests for EJS Definition Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { EJSDefinitionProvider } from './definitionProvider';
import { EJSParser } from '../parser/ejsParser';
import { SymbolAnalyzer } from '../analyzer/symbolAnalyzer';
import { DocumentCacheManager } from '../cache/documentCache';
import { JavaScriptBlock, SymbolInfo, SymbolKind } from '../types';

// Mock VS Code API
vi.mock('vscode', () => ({
  Position: vi.fn().mockImplementation((line: number, character: number) => ({ line, character })),
  Location: vi.fn().mockImplementation((uri: any, position: any) => ({ uri, range: { start: position, end: position } })),
  Range: vi.fn().mockImplementation((start: any, end: any) => ({ start, end })),
}));

describe('EJSDefinitionProvider', () => {
  let definitionProvider: EJSDefinitionProvider;
  let mockParser: EJSParser;
  let mockSymbolAnalyzer: SymbolAnalyzer;
  let mockCache: DocumentCacheManager;
  let mockDocument: vscode.TextDocument;
  let mockCancellationToken: vscode.CancellationToken;

  beforeEach(() => {
    mockParser = new EJSParser();
    mockSymbolAnalyzer = new SymbolAnalyzer();
    mockCache = new DocumentCacheManager();
    definitionProvider = new EJSDefinitionProvider(mockParser, mockSymbolAnalyzer, mockCache);

    // Mock document
    mockDocument = {
      uri: { toString: () => 'test://test.ejs' },
      getText: vi.fn(),
      getWordRangeAtPosition: vi.fn(),
      lineAt: vi.fn(),
      lineCount: 10,
      fileName: 'test.ejs',
      languageId: 'ejs',
      version: 1,
      isDirty: false,
      isClosed: false,
      save: vi.fn(),
      eol: 1,
      positionAt: vi.fn(),
      offsetAt: vi.fn(),
      validateRange: vi.fn(),
      validatePosition: vi.fn()
    } as any;

    // Mock cancellation token
    mockCancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn()
    } as any;
  });

  describe('provideDefinition', () => {
    it('should return null when not inside a JavaScript block', async () => {
      // Setup: document with no EJS blocks at cursor position
      const content = '<html><body>Hello World</body></html>';
      (mockDocument.getText as any).mockReturnValue(content);
      
      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks: [],
        symbols: []
      });

      const position = new vscode.Position(0, 5);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeNull();
    });

    it('should return null when no word is at the cursor position', async () => {
      // Setup: cursor on whitespace
      const content = '<% const name = "test"; %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue(null);

      const jsBlocks: JavaScriptBlock[] = [{
        content: 'const name = "test";',
        startLine: 0,
        endLine: 0,
        startCharacter: 3,
        endCharacter: 22,
        tagType: 'scriptlet'
      }];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols: []
      });

      const position = new vscode.Position(0, 10);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeNull();
    });

    it('should return null when symbol is not a valid identifier', async () => {
      // Setup: cursor on a keyword
      const content = '<% const name = "test"; %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue({
        start: new vscode.Position(0, 3),
        end: new vscode.Position(0, 8)
      });
      (mockDocument.getText as any).mockImplementation((range?: any) => {
        if (range) return 'const';
        return content;
      });

      const jsBlocks: JavaScriptBlock[] = [{
        content: 'const name = "test";',
        startLine: 0,
        endLine: 0,
        startCharacter: 3,
        endCharacter: 22,
        tagType: 'scriptlet'
      }];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols: []
      });

      const position = new vscode.Position(0, 5);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeNull();
    });

    it('should return definition location when variable is found', async () => {
      // Setup: cursor on a variable that has a definition
      const content = '<% const _viewsPath = "/views"; %><%= _viewsPath %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue({
        start: new vscode.Position(0, 35),
        end: new vscode.Position(0, 45)
      });
      (mockDocument.getText as any).mockImplementation((range?: any) => {
        if (range) return '_viewsPath';
        return content;
      });

      const jsBlocks: JavaScriptBlock[] = [
        {
          content: 'const _viewsPath = "/views";',
          startLine: 0,
          endLine: 0,
          startCharacter: 3,
          endCharacter: 31,
          tagType: 'scriptlet'
        },
        {
          content: '_viewsPath',
          startLine: 0,
          endLine: 0,
          startCharacter: 35,
          endCharacter: 45,
          tagType: 'output'
        }
      ];

      const symbols: SymbolInfo[] = [{
        name: '_viewsPath',
        kind: SymbolKind.Constant,
        location: { line: 0, character: 9, length: 10 },
        definition: { line: 0, character: 9, length: 10 },
        references: [{ line: 0, character: 9, length: 10 }],
        value: '"/views"'
      }];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols
      });

      vi.spyOn(mockSymbolAnalyzer, 'analyzeSymbols').mockReturnValue(symbols);

      const position = new vscode.Position(0, 40);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('range');
    });

    it('should return null when variable definition is not found', async () => {
      // Setup: cursor on undefined variable
      const content = '<%= undefinedVar %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue({
        start: new vscode.Position(0, 4),
        end: new vscode.Position(0, 16)
      });
      (mockDocument.getText as any).mockImplementation((range?: any) => {
        if (range) return 'undefinedVar';
        return content;
      });

      const jsBlocks: JavaScriptBlock[] = [{
        content: 'undefinedVar',
        startLine: 0,
        endLine: 0,
        startCharacter: 4,
        endCharacter: 16,
        tagType: 'output'
      }];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols: []
      });

      vi.spyOn(mockSymbolAnalyzer, 'analyzeSymbols').mockReturnValue([]);

      const position = new vscode.Position(0, 10);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeNull();
    });

    it('should return first definition when multiple definitions exist', async () => {
      // Setup: variable defined multiple times
      const content = '<% let name = "first"; %><% let name = "second"; %><%= name %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue({
        start: new vscode.Position(0, 54),
        end: new vscode.Position(0, 58)
      });
      (mockDocument.getText as any).mockImplementation((range?: any) => {
        if (range) return 'name';
        return content;
      });

      const jsBlocks: JavaScriptBlock[] = [
        {
          content: 'let name = "first";',
          startLine: 0,
          endLine: 0,
          startCharacter: 3,
          endCharacter: 22,
          tagType: 'scriptlet'
        },
        {
          content: 'let name = "second";',
          startLine: 0,
          endLine: 0,
          startCharacter: 27,
          endCharacter: 47,
          tagType: 'scriptlet'
        },
        {
          content: 'name',
          startLine: 0,
          endLine: 0,
          startCharacter: 54,
          endCharacter: 58,
          tagType: 'output'
        }
      ];

      const symbols: SymbolInfo[] = [
        {
          name: 'name',
          kind: SymbolKind.Variable,
          location: { line: 0, character: 7, length: 4 },
          definition: { line: 0, character: 7, length: 4 },
          references: [{ line: 0, character: 7, length: 4 }],
          value: '"first"'
        },
        {
          name: 'name',
          kind: SymbolKind.Variable,
          location: { line: 0, character: 31, length: 4 },
          definition: { line: 0, character: 31, length: 4 },
          references: [{ line: 0, character: 31, length: 4 }],
          value: '"second"'
        }
      ];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols
      });

      vi.spyOn(mockSymbolAnalyzer, 'analyzeSymbols').mockReturnValue(symbols);

      const position = new vscode.Position(0, 56);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('range');
      // Should return the first definition (line 0, character 7)
    });

    it('should handle cancellation token', async () => {
      // Setup: cancellation requested
      const cancelledToken = {
        isCancellationRequested: true,
        onCancellationRequested: vi.fn()
      } as any;

      const position = new vscode.Position(0, 0);
      const result = await definitionProvider.provideDefinition(mockDocument, position, cancelledToken);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Setup: parser throws error
      (mockDocument.getText as any).mockReturnValue('<% const name = "test"; %>');
      vi.spyOn(mockParser, 'parseDocument').mockImplementation(() => {
        throw new Error('Parser error');
      });

      const position = new vscode.Position(0, 10);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeNull();
    });

    it('should work with different EJS tag types', async () => {
      // Setup: test with unescaped output tag
      const content = '<% const data = "test"; %><%- data %>';
      (mockDocument.getText as any).mockReturnValue(content);
      (mockDocument.getWordRangeAtPosition as any).mockReturnValue({
        start: new vscode.Position(0, 30),
        end: new vscode.Position(0, 34)
      });
      (mockDocument.getText as any).mockImplementation((range?: any) => {
        if (range) return 'data';
        return content;
      });

      const jsBlocks: JavaScriptBlock[] = [
        {
          content: 'const data = "test";',
          startLine: 0,
          endLine: 0,
          startCharacter: 3,
          endCharacter: 23,
          tagType: 'scriptlet'
        },
        {
          content: 'data',
          startLine: 0,
          endLine: 0,
          startCharacter: 30,
          endCharacter: 34,
          tagType: 'unescaped'
        }
      ];

      const symbols: SymbolInfo[] = [{
        name: 'data',
        kind: SymbolKind.Constant,
        location: { line: 0, character: 9, length: 4 },
        definition: { line: 0, character: 9, length: 4 },
        references: [{ line: 0, character: 9, length: 4 }],
        value: '"test"'
      }];

      vi.spyOn(mockParser, 'parseDocument').mockReturnValue({
        jsBlocks,
        symbols
      });

      vi.spyOn(mockSymbolAnalyzer, 'analyzeSymbols').mockReturnValue(symbols);

      const position = new vscode.Position(0, 32);
      const result = await definitionProvider.provideDefinition(mockDocument, position, mockCancellationToken);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('range');
    });
  });

  describe('findBlockAtPosition', () => {
    it('should find single-line block containing position', () => {
      const blocks = [{
        content: 'const name = "test";',
        startLine: 0,
        endLine: 0,
        startCharacter: 3,
        endCharacter: 23,
        tagType: 'scriptlet'
      }];

      const position = new vscode.Position(0, 10);
      const result = (definitionProvider as any).findBlockAtPosition(blocks, position);

      expect(result).toBe(blocks[0]);
    });

    it('should find multi-line block containing position', () => {
      const blocks = [{
        content: 'if (condition) {\n  doSomething();\n}',
        startLine: 0,
        endLine: 2,
        startCharacter: 3,
        endCharacter: 1,
        tagType: 'scriptlet'
      }];

      const position = new vscode.Position(1, 5);
      const result = (definitionProvider as any).findBlockAtPosition(blocks, position);

      expect(result).toBe(blocks[0]);
    });

    it('should return null when position is outside all blocks', () => {
      const blocks = [{
        content: 'const name = "test";',
        startLine: 0,
        endLine: 0,
        startCharacter: 3,
        endCharacter: 23,
        tagType: 'scriptlet'
      }];

      const position = new vscode.Position(1, 0);
      const result = (definitionProvider as any).findBlockAtPosition(blocks, position);

      expect(result).toBeNull();
    });
  });

  describe('isValidIdentifier', () => {
    it('should return true for valid identifiers', () => {
      const validIds = ['name', '_private', '$jquery', 'camelCase', 'snake_case', 'name123'];
      
      for (const id of validIds) {
        expect((definitionProvider as any).isValidIdentifier(id)).toBe(true);
      }
    });

    it('should return false for invalid identifiers', () => {
      const invalidIds = ['123name', 'name-with-dash', 'name with space', '', 'const', 'function'];
      
      for (const id of invalidIds) {
        expect((definitionProvider as any).isValidIdentifier(id)).toBe(false);
      }
    });
  });
});