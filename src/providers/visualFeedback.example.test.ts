/**
 * Tests for EJS Visual Feedback with the actual example file
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { EJSVisualFeedbackProvider } from "./visualFeedbackProvider";
import { EJSParser } from "../parser/ejsParser";
import { SymbolAnalyzer } from "../analyzer/symbolAnalyzer";

// Mock CancellationToken
class MockCancellationToken implements vscode.CancellationToken {
  constructor(public isCancellationRequested: boolean = false) {}

  onCancellationRequested: vscode.Event<any> = () => {
    return { dispose: () => {} };
  };
}

// Mock TextDocument class
class MockTextDocument implements vscode.TextDocument {
  public fileName: string;
  public isUntitled: boolean = false;
  public encoding: string = "utf8";
  public isDirty: boolean = false;
  public isClosed: boolean = false;
  public eol: vscode.EndOfLine = vscode.EndOfLine.LF;
  public lineCount: number;

  constructor(
    public uri: any,
    public languageId: string,
    public version: number,
    public content: string
  ) {
    this.fileName = uri.toString();
    this.lineCount = content.split("\n").length;
  }

  getText(range?: vscode.Range): string {
    if (!range) return this.content;
    const lines = this.content.split("\n");
    const startLine = range.start.line;
    const endLine = range.end.line;

    if (startLine === endLine) {
      return (
        lines[startLine]?.substring(
          range.start.character,
          range.end.character
        ) || ""
      );
    }

    // Multi-line range
    let result = "";
    for (let i = startLine; i <= endLine; i++) {
      if (i === startLine) {
        result += lines[i]?.substring(range.start.character) || "";
      } else if (i === endLine) {
        result += "\n" + (lines[i]?.substring(0, range.end.character) || "");
      } else {
        result += "\n" + (lines[i] || "");
      }
    }
    return result;
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

  lineAt(line: number): vscode.TextLine;
  lineAt(position: vscode.Position): vscode.TextLine;
  lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
    const lineNumber =
      typeof lineOrPosition === "number" ? lineOrPosition : lineOrPosition.line;
    const lines = this.content.split("\n");
    const text = lines[lineNumber] || "";

    return {
      lineNumber,
      text,
      range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new vscode.Range(
        lineNumber,
        0,
        lineNumber + 1,
        0
      ),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0,
    };
  }

  offsetAt(position: vscode.Position): number {
    const lines = this.content.split("\n");
    let offset = 0;

    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    offset += position.character;
    return offset;
  }

  positionAt(offset: number): vscode.Position {
    const lines = this.content.split("\n");
    let currentOffset = 0;

    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length;
      if (currentOffset + lineLength >= offset) {
        return new vscode.Position(line, offset - currentOffset);
      }
      currentOffset += lineLength + 1; // +1 for newline
    }

    return new vscode.Position(
      lines.length - 1,
      lines[lines.length - 1]?.length || 0
    );
  }

  validateRange(range: vscode.Range): vscode.Range {
    return range; // Simplified for testing
  }

  validatePosition(position: vscode.Position): vscode.Position {
    return position; // Simplified for testing
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }
}

describe("EJS Visual Feedback with Example File", () => {
  let provider: EJSVisualFeedbackProvider;
  let parser: EJSParser;
  let symbolAnalyzer: SymbolAnalyzer;
  let exampleContent: string;

  beforeEach(() => {
    parser = new EJSParser();
    symbolAnalyzer = new SymbolAnalyzer();
    provider = new EJSVisualFeedbackProvider(parser, symbolAnalyzer);

    // Load the actual example EJS file
    const examplePath = path.join(process.cwd(), "example", "form-modal.ejs");
    exampleContent = fs.readFileSync(examplePath, "utf-8");
  });

  describe("Visual feedback with form-modal.ejs", () => {
    it("should provide highlights for _viewsPath variable", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent
      );

      // Find the first usage of _viewsPath (not the definition on line 0)
      const lines = exampleContent.split("\n");
      let testPosition: vscode.Position | null = null;

      for (let i = 1; i < lines.length; i++) {
        // Start from line 1 to skip definition
        const line = lines[i];
        const match = line.match(/_viewsPath/);
        if (match) {
          testPosition = new vscode.Position(i, match.index! + 1);
          break;
        }
      }

      expect(testPosition).not.toBeNull();

      if (testPosition) {
        const token = new MockCancellationToken();
        const result = provider.provideDocumentHighlights(
          document,
          testPosition,
          token
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (Array.isArray(result)) {
          expect(result.length).toBeGreaterThan(0);

          // Should have at least one Write highlight (definition) and one Read highlight (usage)
          const writeHighlights = result.filter(
            (h) => h.kind === vscode.DocumentHighlightKind.Write
          );
          const readHighlights = result.filter(
            (h) => h.kind === vscode.DocumentHighlightKind.Read
          );

          expect(writeHighlights.length).toBeGreaterThan(0);
          expect(readHighlights.length).toBeGreaterThan(0);
        }
      }
    });

    it("should detect _editing variable correctly", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent
      );

      // Find a usage of _editing variable
      const lines = exampleContent.split("\n");
      let testPosition: vscode.Position | null = null;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Look for _editing usage (not definition)
        const match = line.match(/_editing(?!\s*=)/);
        if (match) {
          testPosition = new vscode.Position(i, match.index! + 1);
          break;
        }
      }

      if (testPosition) {
        const result = provider.isOverDefinedVariable(document, testPosition);
        expect(result).toBe(true);
      }
    });

    it("should handle complex variable expressions", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent
      );

      // Find usage of _socialChannel variable
      const lines = exampleContent.split("\n");
      let testPosition: vscode.Position | null = null;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/_socialChannel(?!\s*=)/);
        if (match) {
          testPosition = new vscode.Position(i, match.index! + 1);
          break;
        }
      }

      if (testPosition) {
        const result = provider.isOverDefinedVariable(document, testPosition);
        expect(result).toBe(true);

        const token = new MockCancellationToken();
        const highlights = provider.provideDocumentHighlights(
          document,
          testPosition,
          token
        );
        expect(highlights).toBeDefined();
        if (Array.isArray(highlights)) {
          expect(highlights.length).toBeGreaterThan(0);
        }
      }
    });

    it("should return false for undefined variables", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent + "\n<%= undefinedVariable %>"
      );

      const lines = (exampleContent + "\n<%= undefinedVariable %>").split("\n");
      const lastLine = lines[lines.length - 1];
      const variableIndex = lastLine.indexOf("undefinedVariable");
      const testPosition = new vscode.Position(
        lines.length - 1,
        variableIndex + 1
      );

      const result = provider.isOverDefinedVariable(document, testPosition);
      expect(result).toBe(false);
    });

    it("should handle variables with similar names correctly", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent
      );

      // Test with _socialChannelName vs _socialChannel
      const lines = exampleContent.split("\n");
      let socialChannelNamePosition: vscode.Position | null = null;
      let socialChannelPosition: vscode.Position | null = null;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (!socialChannelNamePosition) {
          const nameMatch = line.match(/_socialChannelName(?!\s*=)/);
          if (nameMatch) {
            socialChannelNamePosition = new vscode.Position(
              i,
              nameMatch.index! + 1
            );
          }
        }

        if (!socialChannelPosition) {
          const channelMatch = line.match(/_socialChannel(?!Name)(?!\s*=)/);
          if (channelMatch) {
            socialChannelPosition = new vscode.Position(
              i,
              channelMatch.index! + 1
            );
          }
        }

        if (socialChannelNamePosition && socialChannelPosition) break;
      }

      // Both should be detected as defined variables
      if (socialChannelNamePosition) {
        const result1 = provider.isOverDefinedVariable(
          document,
          socialChannelNamePosition
        );
        expect(result1).toBe(true);
      }

      if (socialChannelPosition) {
        const result2 = provider.isOverDefinedVariable(
          document,
          socialChannelPosition
        );
        expect(result2).toBe(true);
      }
    });

    it("should perform well with the large example file", () => {
      const document = new MockTextDocument(
        { toString: () => "form-modal.ejs" },
        "ejs",
        1,
        exampleContent
      );

      // Test performance with a variable in the middle of the file
      const lines = exampleContent.split("\n");
      const middleLine = Math.floor(lines.length / 2);

      // Find a variable usage around the middle
      let testPosition: vscode.Position | null = null;
      for (
        let i = middleLine;
        i < Math.min(middleLine + 10, lines.length);
        i++
      ) {
        const line = lines[i];
        const match = line.match(/_\w+/);
        if (match) {
          testPosition = new vscode.Position(i, match.index! + 1);
          break;
        }
      }

      if (testPosition) {
        const startTime = Date.now();
        const result = provider.isOverDefinedVariable(document, testPosition);
        const endTime = Date.now();

        // Should complete within 500ms as per requirements
        expect(endTime - startTime).toBeLessThan(500);

        // Result should be boolean (either true or false)
        expect(typeof result).toBe("boolean");
      }
    });
  });
});
