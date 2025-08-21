/**
 * VS Code Definition Provider for EJS templates
 */

import * as vscode from 'vscode';
import { IEJSParser, ISymbolAnalyzer } from '../interfaces';

/**
 * Provides "Go to Definition" functionality for EJS templates
 */
export class EJSDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private parser: IEJSParser,
    private symbolAnalyzer: ISymbolAnalyzer
  ) {}

  /**
   * Provide definition location for a symbol at the given position
   * @param document The document in which the command was invoked
   * @param position The position at which the command was invoked
   * @param token A cancellation token
   * @returns Definition location or null if not found
   */
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition> {
    try {
      // Check if cancellation was requested
      if (token.isCancellationRequested) {
        return null;
      }

      // Parse the document to extract JavaScript blocks
      const parsedDocument = this.parser.parseDocument(document);
      
      // Check if we're inside a JavaScript block
      const currentBlock = this.findBlockAtPosition(parsedDocument.jsBlocks, position);
      if (!currentBlock) {
        return null; // Not inside a JavaScript block
      }

      // Get the word at the current position
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return null; // No word at position
      }

      const symbolName = document.getText(wordRange);
      if (!symbolName || !this.isValidIdentifier(symbolName)) {
        return null; // Not a valid identifier
      }

      // Analyze symbols in all JavaScript blocks
      const symbols = this.symbolAnalyzer.analyzeSymbols(parsedDocument.jsBlocks);
      
      // Find the definition for this symbol
      const definition = this.findSymbolDefinition(symbols, symbolName);
      if (!definition) {
        return null; // Definition not found
      }

      // Convert our Location to VS Code Location
      const definitionLocation = new vscode.Location(
        document.uri,
        new vscode.Position(definition.definition.line, definition.definition.character)
      );

      return definitionLocation;
    } catch (error) {
      // Log error but don't throw - VS Code expects graceful handling
      console.error('Error in EJS Definition Provider:', error);
      return null;
    }
  }

  /**
   * Find the JavaScript block that contains the given position
   * @param blocks Array of JavaScript blocks
   * @param position Position to check
   * @returns The block containing the position, or null if not found
   */
  private findBlockAtPosition(blocks: any[], position: vscode.Position): any | null {
    for (const block of blocks) {
      // Check if position is within this block
      if (position.line >= block.startLine && position.line <= block.endLine) {
        // If it's a single line block, check character position
        if (block.startLine === block.endLine) {
          if (position.character >= block.startCharacter && 
              position.character <= block.endCharacter) {
            return block;
          }
        } else {
          // Multi-line block
          if (position.line === block.startLine) {
            // First line - check if after start character
            if (position.character >= block.startCharacter) {
              return block;
            }
          } else if (position.line === block.endLine) {
            // Last line - check if before end character
            if (position.character <= block.endCharacter) {
              return block;
            }
          } else {
            // Middle line - always included
            return block;
          }
        }
      }
    }
    return null;
  }

  /**
   * Find the definition of a symbol by name
   * @param symbols Array of all symbols found in the document
   * @param symbolName Name of the symbol to find
   * @returns Symbol information if found, null otherwise
   */
  private findSymbolDefinition(symbols: any[], symbolName: string): any | null {
    // Find all symbols with the given name
    const matchingSymbols = symbols.filter(symbol => symbol.name === symbolName);
    
    if (matchingSymbols.length === 0) {
      return null;
    }

    // Return the first definition found (as per requirements)
    // Sort by line number to ensure we get the first occurrence
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
   * @param identifier The string to check
   * @returns True if it's a valid identifier
   */
  private isValidIdentifier(identifier: string): boolean {
    // JavaScript identifier rules: start with letter, $, or _, followed by letters, digits, $, or _
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(identifier) && !this.isKeyword(identifier);
  }

  /**
   * Check if a string is a JavaScript keyword
   * @param word The word to check
   * @returns True if it's a keyword
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