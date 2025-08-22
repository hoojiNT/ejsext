/**
 * Unit tests for EJS Hover Provider
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as vscode from "vscode";
import { EJSHoverProvider } from "./hoverProvider";
import { IEJSParser, ISymbolAnalyzer } from "../interfaces";
import { DocumentCacheManager } from "../cache/documentCache";
import {
  SymbolInfo,
  SymbolKind,
  JavaScriptBlock,
  ParsedEJSDocument,
} from "../types";

// Mock VS Code API
vi.mock("vscode", () => ({
  Position: vi
    .fn()
    .mockImplementation((line: number, character: number) => ({
      line,
      character,
    })),
  Range: vi.fn().mockImplementation((start: any, end: any) => ({ start, end })),
  Location: vi
    .fn()
    .mockImplementation((uri: any, position: any) => ({
      uri,
      range: position,
    })),
  Hover: vi
    .fn()
    .mockImplementation((contents: any, range: any) => ({ contents, range })),
  MarkdownString: vi.fn().mockImplementation(() => ({
    isTrusted: false,
    appendCodeblock: vi.fn(),
    appendMarkdown: vi.fn(),
  })),
  CancellationToken: {
    isCancellationRequested: false,
  },
}));

describe("EJSHoverProvider", () => {
  let hoverProvider: EJSHoverProvider;
  let mockParser: IEJSParser;
  let mockSymbolAnalyzer: ISymbolAnalyzer;
  let mockDocument: vscode.TextDocument;
  let mockCancellationToken: vscode.CancellationToken;

  beforeEach(() => {
    // Create mock parser
    mockParser = {
      parseDocument: vi.fn(),
      extractJavaScriptBlocks: vi.fn(),
    };

    // Create mock symbol analyzer
    mockSymbolAnalyzer = {
      analyzeSymbols: vi.fn(),
      findDefinition: vi.fn(),
    };

    // Create mock document
    mockDocument = {
      uri: { fsPath: "/test/file.ejs" },
      getText: vi.fn(),
      getWordRangeAtPosition: vi.fn(),
    } as any;

    // Create mock cancellation token
    mockCancellationToken = {
      isCancellationRequested: false,
    } as any;

    const mockCache = new DocumentCacheManager();
    hoverProvider = new EJSHoverProvider(mockParser, mockSymbolAnalyzer, mockCache);
  });

  describe("provideHover", () => {
    it("should return null when cancellation is requested", async () => {
      const cancelledToken = {
        isCancellationRequested: true,
      } as vscode.CancellationToken;
      const position = new vscode.Position(0, 5);

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        cancelledToken
      );

      expect(result).toBeNull();
    });

    it("should return null when not inside a JavaScript block", async () => {
      const position = new vscode.Position(0, 5);
      const parsedDocument: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 2,
            endLine: 2,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      vi.mocked(mockParser.parseDocument).mockReturnValue(parsedDocument);

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeNull();
    });

    it("should return null when no word is found at position", async () => {
      const position = new vscode.Position(2, 10);
      const parsedDocument: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 2,
            endLine: 2,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      vi.mocked(mockParser.parseDocument).mockReturnValue(parsedDocument);
      vi.mocked(mockDocument.getWordRangeAtPosition).mockReturnValue(undefined);

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeNull();
    });

    it("should return null when word is not a valid identifier", async () => {
      const position = new vscode.Position(2, 10);
      const wordRange = new vscode.Range(
        new vscode.Position(2, 8),
        new vscode.Position(2, 12)
      );
      const parsedDocument: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 2,
            endLine: 2,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      vi.mocked(mockParser.parseDocument).mockReturnValue(parsedDocument);
      vi.mocked(mockDocument.getWordRangeAtPosition).mockReturnValue(wordRange);
      vi.mocked(mockDocument.getText).mockReturnValue("123invalid");

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeNull();
    });

    it("should return null when symbol definition is not found", async () => {
      const position = new vscode.Position(2, 10);
      const wordRange = new vscode.Range(
        new vscode.Position(2, 8),
        new vscode.Position(2, 12)
      );
      const parsedDocument: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 2,
            endLine: 2,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      vi.mocked(mockParser.parseDocument).mockReturnValue(parsedDocument);
      vi.mocked(mockDocument.getWordRangeAtPosition).mockReturnValue(wordRange);
      vi.mocked(mockDocument.getText).mockReturnValue("test");
      vi.mocked(mockSymbolAnalyzer.analyzeSymbols).mockReturnValue([]);

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeNull();
    });

    it("should return hover information when symbol definition is found", async () => {
      const position = new vscode.Position(2, 10);
      const wordRange = new vscode.Range(
        new vscode.Position(2, 8),
        new vscode.Position(2, 12)
      );
      const parsedDocument: ParsedEJSDocument = {
        jsBlocks: [
          {
            content: 'const test = "value"',
            startLine: 2,
            endLine: 2,
            startCharacter: 3,
            endCharacter: 23,
            tagType: "scriptlet",
          },
        ],
        symbols: [],
      };

      const symbolInfo: SymbolInfo = {
        name: "test",
        kind: SymbolKind.Constant,
        location: { line: 2, character: 6, length: 4 },
        definition: { line: 2, character: 6, length: 4 },
        references: [],
        value: '"value"',
      };

      vi.mocked(mockParser.parseDocument).mockReturnValue(parsedDocument);
      vi.mocked(mockDocument.getWordRangeAtPosition).mockReturnValue(wordRange);
      vi.mocked(mockDocument.getText).mockReturnValue("test");
      vi.mocked(mockSymbolAnalyzer.analyzeSymbols).mockReturnValue([
        symbolInfo,
      ]);

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(vscode.Hover).toHaveBeenCalledWith(expect.any(Object), wordRange);
    });

    it("should handle errors gracefully and return null", async () => {
      const position = new vscode.Position(2, 10);

      vi.mocked(mockParser.parseDocument).mockImplementation(() => {
        throw new Error("Parse error");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await hoverProvider.provideHover(
        mockDocument,
        position,
        mockCancellationToken
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in EJS Hover Provider:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("createHoverContent", () => {
    it("should create hover content with symbol information", () => {
      const symbolInfo = {
        name: "testVar",
        kind: SymbolKind.Constant,
        definition: { line: 1, character: 6, length: 7 },
        value: '"hello"',
        declarationType: "const",
        scope: "block",
      };

      const mockMarkdownString = {
        isTrusted: false,
        appendCodeblock: vi.fn(),
        appendMarkdown: vi.fn(),
      };

      vi.mocked(vscode.MarkdownString).mockReturnValue(
        mockMarkdownString as any
      );

      // Access private method through any cast for testing
      const result = (hoverProvider as any).createHoverContent(
        symbolInfo,
        mockDocument
      );

      expect(mockMarkdownString.isTrusted).toBe(true);
      expect(mockMarkdownString.appendCodeblock).toHaveBeenCalledWith(
        "const testVar",
        "javascript"
      );
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledWith(
        "\n**Definition:** Line 2"
      );
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledWith(
        '\n\n**Value:** `"hello"`'
      );
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledWith(
        "\n\n**Declaration:** Constant declaration (const)"
      );
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledWith(
        "\n\n**Scope:** block"
      );
    });

    it("should create hover content without optional fields", () => {
      const symbolInfo = {
        name: "testVar",
        kind: SymbolKind.Variable,
        definition: { line: 0, character: 4, length: 7 },
      };

      const mockMarkdownString = {
        isTrusted: false,
        appendCodeblock: vi.fn(),
        appendMarkdown: vi.fn(),
      };

      vi.mocked(vscode.MarkdownString).mockReturnValue(
        mockMarkdownString as any
      );

      // Access private method through any cast for testing
      const result = (hoverProvider as any).createHoverContent(
        symbolInfo,
        mockDocument
      );

      expect(mockMarkdownString.appendCodeblock).toHaveBeenCalledWith(
        "let/var testVar",
        "javascript"
      );
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledWith(
        "\n**Definition:** Line 1"
      );
      // Should not call appendMarkdown for value, declaration, or scope since they're not provided
      expect(mockMarkdownString.appendMarkdown).toHaveBeenCalledTimes(1);
    });
  });

  describe("helper methods", () => {
    it("should identify valid JavaScript identifiers", () => {
      const provider = hoverProvider as any;

      expect(provider.isValidIdentifier("validName")).toBe(true);
      expect(provider.isValidIdentifier("_private")).toBe(true);
      expect(provider.isValidIdentifier("$jquery")).toBe(true);
      expect(provider.isValidIdentifier("name123")).toBe(true);

      expect(provider.isValidIdentifier("123invalid")).toBe(false);
      expect(provider.isValidIdentifier("invalid-name")).toBe(false);
      expect(provider.isValidIdentifier("const")).toBe(false); // keyword
      expect(provider.isValidIdentifier("")).toBe(false);
    });

    it("should identify JavaScript keywords", () => {
      const provider = hoverProvider as any;

      expect(provider.isKeyword("const")).toBe(true);
      expect(provider.isKeyword("let")).toBe(true);
      expect(provider.isKeyword("var")).toBe(true);
      expect(provider.isKeyword("function")).toBe(true);
      expect(provider.isKeyword("if")).toBe(true);

      expect(provider.isKeyword("validName")).toBe(false);
      expect(provider.isKeyword("customVariable")).toBe(false);
    });

    it("should get correct symbol type display", () => {
      const provider = hoverProvider as any;

      expect(provider.getSymbolTypeDisplay("constant")).toBe("const");
      expect(provider.getSymbolTypeDisplay("variable")).toBe("let/var");
      expect(provider.getSymbolTypeDisplay("parameter")).toBe("parameter");
      expect(provider.getSymbolTypeDisplay("property")).toBe("property");
      expect(provider.getSymbolTypeDisplay("unknown")).toBe("variable");
    });

    it("should get correct declaration type info", () => {
      const provider = hoverProvider as any;

      expect(provider.getDeclarationTypeInfo("const")).toBe(
        "Constant declaration (const)"
      );
      expect(provider.getDeclarationTypeInfo("let")).toBe(
        "Block-scoped variable (let)"
      );
      expect(provider.getDeclarationTypeInfo("var")).toBe(
        "Function-scoped variable (var)"
      );
      expect(provider.getDeclarationTypeInfo("parameter")).toBe(
        "Function parameter"
      );
      expect(provider.getDeclarationTypeInfo("destructured")).toBe(
        "Destructured assignment"
      );
      expect(provider.getDeclarationTypeInfo("unknown")).toBe(
        "Variable declaration"
      );
    });
  });
});
