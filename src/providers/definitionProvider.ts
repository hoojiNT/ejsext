/**
 * VS Code Definition Provider for EJS templates
 */

import * as vscode from 'vscode';
import { IEJSParser, ISymbolAnalyzer, IDocumentCache } from '../interfaces';
import { EJSVisualFeedbackProvider } from './visualFeedbackProvider';

/**
 * Provides "Go to Definition" functionality for EJS templates
 */
export class EJSDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private parser: IEJSParser,
    private symbolAnalyzer: ISymbolAnalyzer,
    private cache: IDocumentCache
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
    const startTime = Date.now();
    
    try {
      // Check if cancellation was requested
      if (token.isCancellationRequested) {
        return null;
      }

      // Performance timeout check
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 500); // 500ms timeout as per requirements
      });

      const definitionPromise = this.findDefinitionInternal(document, position, token);
      
      // Race between definition finding and timeout
      return Promise.race([definitionPromise, timeoutPromise]);
    } catch (error) {
      // Log error but don't throw - VS Code expects graceful handling
      console.error('Error in EJS Definition Provider:', error);
      return null;
    } finally {
      // Record performance metrics
      const parseTime = Date.now() - startTime;
      this.cache.recordParseTime(parseTime);
    }
  }

  /**
   * Internal method to find definition with caching
   * @param document The document
   * @param position The position
   * @param token Cancellation token
   * @returns Definition location or null
   */
  private async findDefinitionInternal(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | null> {
    try {
      // Try to get cached parsed document
      let parsedDocument = this.cache.getParsedDocument(document.uri.toString(), document.version);
      
      if (!parsedDocument) {
        // Parse the document to extract JavaScript blocks
        parsedDocument = this.parser.parseDocument(document);
        
        // Cache the parsed document
        this.cache.setParsedDocument(document.uri.toString(), document.version, parsedDocument);
      }
    
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

    // Check for cancellation before expensive operations
    if (token.isCancellationRequested) {
      return null;
    }

    // Try to get cached symbols
    let symbolIndex = this.cache.getSymbols(document.uri.toString(), document.version);
    
    if (!symbolIndex) {
      // Analyze symbols in all JavaScript blocks
      const symbols = this.symbolAnalyzer.analyzeSymbols(parsedDocument.jsBlocks);
      
      // Create optimized symbol index
      symbolIndex = this.cache.createSymbolIndex(symbols);
      
      // Cache the symbol index
      this.cache.setSymbols(document.uri.toString(), document.version, symbolIndex);
    }
    
    // Find the definition for this symbol using optimized lookup
    const definition = this.findSymbolDefinitionOptimized(symbolIndex, symbolName);
    if (!definition) {
      return null; // Definition not found
    }

    // Convert our Location to VS Code Location
    const definitionLocation = new vscode.Location(
      document.uri,
      new vscode.Position(definition.definition.line, definition.definition.character)
    );

    // Schedule target line highlighting after navigation
    this.scheduleTargetLineHighlight(definition.definition.line);

    return definitionLocation;
    } catch (error) {
      // Log error but don't throw - VS Code expects graceful handling
      console.error('Error in EJS Definition Provider (internal):', error);
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
   * Find the definition of a symbol by name using optimized lookup
   * @param symbolIndex Optimized symbol index map
   * @param symbolName Name of the symbol to find
   * @returns Symbol information if found, null otherwise
   */
  private findSymbolDefinitionOptimized(symbolIndex: Map<string, any[]>, symbolName: string): any | null {
    const matchingSymbols = symbolIndex.get(symbolName);
    
    if (!matchingSymbols || matchingSymbols.length === 0) {
      return null;
    }

    // Return the first definition found (symbols are already sorted in the index)
    return matchingSymbols[0];
  }

  /**
   * Find the definition of a symbol by name (legacy method for compatibility)
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

  /**
   * Schedule target line highlighting after Go to Definition navigation
   * @param line The line number to highlight (0-based)
   */
  private scheduleTargetLineHighlight(line: number): void {
    // Use a small delay to ensure navigation has completed
    setTimeout(() => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.languageId === 'ejs') {
        EJSVisualFeedbackProvider.highlightTargetLine(activeEditor, line);
      }
    }, 100);
  }
}