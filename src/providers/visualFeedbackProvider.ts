/**
 * VS Code Visual Feedback Provider for EJS templates
 * Handles cursor changes, highlighting, and visual feedback for Go to Definition
 */

import * as vscode from 'vscode';
import { IEJSParser, ISymbolAnalyzer } from '../interfaces';

/**
 * Provides visual feedback for EJS variable interactions
 */
export class EJSVisualFeedbackProvider implements vscode.DocumentHighlightProvider {
  private static _highlightDecorationType: vscode.TextEditorDecorationType | undefined;
  private static _targetLineDecorationType: vscode.TextEditorDecorationType | undefined;

  private static get HIGHLIGHT_DECORATION_TYPE(): vscode.TextEditorDecorationType {
    if (!this._highlightDecorationType) {
      this._highlightDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.3)', // Yellow highlight
        border: '1px solid rgba(255, 255, 0, 0.8)',
        borderRadius: '2px'
      });
    }
    return this._highlightDecorationType;
  }

  private static get TARGET_LINE_DECORATION_TYPE(): vscode.TextEditorDecorationType {
    if (!this._targetLineDecorationType) {
      this._targetLineDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green highlight for target line
        isWholeLine: true
      });
    }
    return this._targetLineDecorationType;
  }

  constructor(
    private parser: IEJSParser,
    private symbolAnalyzer: ISymbolAnalyzer
  ) {}

  /**
   * Provide document highlights for a symbol at the given position
   * This enables variable highlighting when hovering
   */
  provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentHighlight[]> {
    try {
      if (token.isCancellationRequested) {
        return null;
      }

      // Parse the document to extract JavaScript blocks
      const parsedDocument = this.parser.parseDocument(document);
      
      // Check if we're inside a JavaScript block
      const currentBlock = this.findBlockAtPosition(parsedDocument.jsBlocks, position);
      if (!currentBlock) {
        return null;
      }

      // Get the word at the current position
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return null;
      }

      const symbolName = document.getText(wordRange);
      if (!symbolName || !this.isValidIdentifier(symbolName)) {
        return null;
      }

      // Analyze symbols in all JavaScript blocks
      const symbols = this.symbolAnalyzer.analyzeSymbols(parsedDocument.jsBlocks);
      
      // Find the definition for this symbol
      const definition = this.findSymbolDefinition(symbols, symbolName);
      if (!definition) {
        return null;
      }

      // Create highlights for the symbol
      const highlights: vscode.DocumentHighlight[] = [];

      // Highlight the definition
      const definitionRange = new vscode.Range(
        definition.definition.line,
        definition.definition.character,
        definition.definition.line,
        definition.definition.character + definition.name.length
      );
      highlights.push(new vscode.DocumentHighlight(definitionRange, vscode.DocumentHighlightKind.Write));

      // Highlight all references
      if (definition.references) {
        for (const reference of definition.references) {
          const referenceRange = new vscode.Range(
            reference.line,
            reference.character,
            reference.line,
            reference.character + definition.name.length
          );
          highlights.push(new vscode.DocumentHighlight(referenceRange, vscode.DocumentHighlightKind.Read));
        }
      }

      return highlights;
    } catch (error) {
      console.error('Error in EJS Visual Feedback Provider:', error);
      return null;
    }
  }

  /**
   * Highlight the target line briefly after Go to Definition navigation
   * @param editor The text editor
   * @param line The line number to highlight (0-based)
   */
  static highlightTargetLine(editor: vscode.TextEditor, line: number): void {
    const range = new vscode.Range(line, 0, line, 0);
    const decoration = { range };

    // Apply the decoration
    editor.setDecorations(EJSVisualFeedbackProvider.TARGET_LINE_DECORATION_TYPE, [decoration]);

    // Remove the decoration after 2 seconds
    setTimeout(() => {
      editor.setDecorations(EJSVisualFeedbackProvider.TARGET_LINE_DECORATION_TYPE, []);
    }, 2000);
  }

  /**
   * Check if a position is over a defined variable (for cursor styling)
   * @param document The document
   * @param position The position to check
   * @returns True if the position is over a defined variable
   */
  isOverDefinedVariable(document: vscode.TextDocument, position: vscode.Position): boolean {
    try {
      // Parse the document to extract JavaScript blocks
      const parsedDocument = this.parser.parseDocument(document);
      
      // Check if we're inside a JavaScript block
      const currentBlock = this.findBlockAtPosition(parsedDocument.jsBlocks, position);
      if (!currentBlock) {
        return false;
      }

      // Get the word at the current position
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return false;
      }

      const symbolName = document.getText(wordRange);
      if (!symbolName || !this.isValidIdentifier(symbolName)) {
        return false;
      }

      // Analyze symbols in all JavaScript blocks
      const symbols = this.symbolAnalyzer.analyzeSymbols(parsedDocument.jsBlocks);
      
      // Check if this symbol has a definition
      const definition = this.findSymbolDefinition(symbols, symbolName);
      return definition !== null;
    } catch (error) {
      console.error('Error checking if over defined variable:', error);
      return false;
    }
  }

  /**
   * Find the JavaScript block that contains the given position
   */
  private findBlockAtPosition(blocks: any[], position: vscode.Position): any | null {
    for (const block of blocks) {
      if (position.line >= block.startLine && position.line <= block.endLine) {
        if (block.startLine === block.endLine) {
          if (position.character >= block.startCharacter && 
              position.character <= block.endCharacter) {
            return block;
          }
        } else {
          if (position.line === block.startLine) {
            if (position.character >= block.startCharacter) {
              return block;
            }
          } else if (position.line === block.endLine) {
            if (position.character <= block.endCharacter) {
              return block;
            }
          } else {
            return block;
          }
        }
      }
    }
    return null;
  }

  /**
   * Find the definition of a symbol by name
   */
  private findSymbolDefinition(symbols: any[], symbolName: string): any | null {
    const matchingSymbols = symbols.filter(symbol => symbol.name === symbolName);
    
    if (matchingSymbols.length === 0) {
      return null;
    }

    matchingSymbols.sort((a, b) => {
      if (a.definition.line !== b.definition.line) {
        return a.definition.line - b.definition.line;
      }
      return a.definition.character - b.definition.character;
    });

    return matchingSymbols[0];
  }

  /**
   * Check if a string is a valid JavaScript identifier
   */
  private isValidIdentifier(identifier: string): boolean {
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(identifier) && !this.isKeyword(identifier);
  }

  /**
   * Check if a string is a JavaScript keyword
   */
  private isKeyword(word: string): boolean {
    const keywords = [
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
      'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
      'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super',
      'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
      'with', 'yield', 'true', 'false', 'null', 'undefined'
    ];
    
    return keywords.includes(word);
  }
}