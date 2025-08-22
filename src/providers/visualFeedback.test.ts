/**
 * Tests for EJS Visual Feedback Provider
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as vscode from "vscode";
import { EJSVisualFeedbackProvider } from "./visualFeedbackProvider";
import { EJSParser } from "../parser/ejsParser";
import { SymbolAnalyzer } from "../analyzer/symbolAnalyzer";

// Mock TextDocument class
class MockTextDocument {
  constructor(
    public uri: any,
    public languageId: string,
    public version: number,
    public content: string
  ) {}

  getText(range?: vscode.Range): string {
    if (!range) return this.content;
    const lines = this.content.split("\n");
    return (
      lines[range.start.line]?.substring(
        range.start.character,
        range.end.character
      ) || ""
    );
  }

  getWordRangeAtPosition(position: vscode.Position): vscode.Range | undefined {
    const lines = this.content.split("\n");
    const line = lines[position.line];
    if (!line) return undefined;

    // Find word boundaries
    let start = position.character;
    let end = position.character;

    // Move start backward to find word start
    while (start > 0 && /[a-zA-Z0-9_$]/.test(line[start - 1])) {
      start--;
    }

    // Move end forward to find word end
    while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) {
      end++;
    }

    if (start === end) return undefined;

    return new vscode.Range(
      new vscode.Position(position.line, start),
      new vscode.Position(position.line, end)
    );
  }
}

describe("EJSVisualFeedbackProvider", () => {
  let provider: EJSVisualFeedbackProvider;
  let parser: EJSParser;
  let symbolAnalyzer: SymbolAnalyzer;

  beforeEach(() => {
    parser = new EJSParser();
    symbolAnalyzer = new SymbolAnalyzer();
    provider = new EJSVisualFeedbackProvider(parser, symbolAnalyzer);
  });

  describe("provideDocumentHighlights", () => {
    it("should return null for positions outside JavaScript blocks", async () => {
      const content = "<h1>Hello World</h1>";
      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );
      const position = new vscode.Position(0, 5);
      const token = { isCancellationRequested: false };

      const result = provider.provideDocumentHighlights(
        document as any,
        position,
        token as any
      );
      expect(result).toBeNull();
    });

    it("should return highlights for defined variables", async () => {
      const content = `<% const _viewsPath = '/views'; %>
<div><%= _viewsPath %></div>`;

      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );

      // Position over the variable usage
      const position = new vscode.Position(1, 10);
      const token = { isCancellationRequested: false };

      const result = provider.provideDocumentHighlights(
        document as any,
        position,
        token as any
      );

      // Should return highlights for both definition and usage
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it("should return null for undefined variables", async () => {
      const content = `<% const _viewsPath = '/views'; %>
<div><%= undefinedVar %></div>`;

      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );

      // Position over the undefined variable
      const position = new vscode.Position(1, 10);
      const token = { isCancellationRequested: false };

      const result = provider.provideDocumentHighlights(
        document as any,
        position,
        token as any
      );
      expect(result).toBeNull();
    });
  });

  describe("isOverDefinedVariable", () => {
    it("should return true for defined variables", () => {
      const content = `<% const _viewsPath = '/views'; %>
<div><%= _viewsPath %></div>`;

      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );

      // Position over the variable usage
      const position = new vscode.Position(1, 10);

      const result = provider.isOverDefinedVariable(document as any, position);
      expect(result).toBe(true);
    });

    it("should return false for undefined variables", () => {
      const content = `<% const _viewsPath = '/views'; %>
<div><%= undefinedVar %></div>`;

      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );

      // Position over the undefined variable
      const position = new vscode.Position(1, 10);

      const result = provider.isOverDefinedVariable(document as any, position);
      expect(result).toBe(false);
    });

    it("should return false for positions outside JavaScript blocks", () => {
      const content = "<h1>Hello World</h1>";
      const document = new MockTextDocument(
        { toString: () => "test.ejs" },
        "ejs",
        1,
        content
      );
      const position = new vscode.Position(0, 5);

      const result = provider.isOverDefinedVariable(document as any, position);
      expect(result).toBe(false);
    });
  });

  describe("highlightTargetLine", () => {
    it("should create target line decoration", () => {
      // Mock text editor
      const mockEditor = {
        setDecorations: vi.fn(),
      } as any;

      // Call the static method
      EJSVisualFeedbackProvider.highlightTargetLine(mockEditor, 5);

      // Should call setDecorations immediately
      expect(mockEditor.setDecorations).toHaveBeenCalledTimes(1);

      // Should clear decorations after timeout (test with shorter timeout)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockEditor.setDecorations).toHaveBeenCalledTimes(2);
          resolve();
        }, 2100);
      });
    });
  });
});
