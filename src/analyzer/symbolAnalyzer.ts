/**
 * Symbol analyzer for identifying variable definitions and references
 */

import * as vscode from 'vscode';
import { ISymbolAnalyzer } from '../interfaces';
import { JavaScriptBlock, SymbolInfo, SymbolKind, DeclarationType, SymbolScope, Location } from '../types';

/**
 * Analyzes JavaScript blocks to identify variable definitions and references
 */
export class SymbolAnalyzer implements ISymbolAnalyzer {
  private symbols: Map<string, SymbolInfo[]> = new Map();

  /**
   * Analyze JavaScript blocks to identify variable definitions and references
   * @param jsBlocks Array of JavaScript blocks to analyze
   * @returns Array of symbol information found in the blocks
   */
  analyzeSymbols(jsBlocks: JavaScriptBlock[]): SymbolInfo[] {
    this.symbols.clear();
    const allSymbols: SymbolInfo[] = [];

    for (const block of jsBlocks) {
      const blockSymbols = this.analyzeBlock(block);
      allSymbols.push(...blockSymbols);
    }

    return allSymbols;
  }

  /**
   * Find the definition of a symbol at a specific position
   * @param symbolName Name of the symbol to find
   * @param position Position where the symbol is referenced
   * @returns Symbol information if found, null otherwise
   */
  findDefinition(symbolName: string, position: vscode.Position): SymbolInfo | null {
    const symbolList = this.symbols.get(symbolName);
    if (!symbolList || symbolList.length === 0) {
      return null;
    }

    // Return the first definition found (as per requirements)
    return symbolList[0];
  }

  /**
   * Analyze a single JavaScript block for variable definitions
   * @param block The JavaScript block to analyze
   * @returns Array of symbols found in the block
   */
  private analyzeBlock(block: JavaScriptBlock): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = block.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = block.startLine + i;
      
      // Find variable declarations in this line
      const lineSymbols = this.findVariableDeclarations(line, lineNumber, block.startCharacter);
      symbols.push(...lineSymbols);
    }

    // Store symbols in the map for quick lookup
    for (const symbol of symbols) {
      if (!this.symbols.has(symbol.name)) {
        this.symbols.set(symbol.name, []);
      }
      this.symbols.get(symbol.name)!.push(symbol);
    }

    return symbols;
  }

  /**
   * Find variable declarations in a single line of code
   * @param line The line of code to analyze
   * @param lineNumber The line number in the document
   * @param baseCharacter The base character offset for this line
   * @returns Array of symbols found in the line
   */
  private findVariableDeclarations(line: string, lineNumber: number, baseCharacter: number): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    // Pattern for const/let/var declarations
    const declarationPatterns = [
      {
        // const/let/var with simple assignment: const name = value
        regex: /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^,;]+)/g,
        type: 'simple' as const
      },
      {
        // const/let/var without assignment: const name
        regex: /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=[,;]|$)/g,
        type: 'simple' as const
      },
      {
        // Destructuring assignment: const {a, b} = obj or const [x, y] = arr
        regex: /\b(const|let|var)\s*([{[])((?:[^{}[\]]+|[{[][^{}[\]]*[}\]])*)[}\]]\s*=\s*([^,;]+)/g,
        type: 'destructuring' as const
      }
    ];

    // Function parameter pattern: function name(param1, param2) or (param1, param2) =>
    const functionParamPatterns = [
      {
        // Regular function: function name(params)
        regex: /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(\s*([^)]*)\s*\)/g,
        type: 'function' as const
      },
      {
        // Arrow function: (params) => or param =>
        regex: /(?:^|[^a-zA-Z0-9_$])\(\s*([^)]*)\s*\)\s*=>/g,
        type: 'arrow' as const
      },
      {
        // Single parameter arrow function: param =>
        regex: /(?:^|[^a-zA-Z0-9_$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g,
        type: 'single-arrow' as const
      }
    ];

    // Process declaration patterns
    for (const pattern of declarationPatterns) {
      let match;
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(line)) !== null) {
        if (pattern.type === 'simple') {
          const declarationType = match[1] as DeclarationType;
          const variableName = match[2];
          const value = match[3]?.trim();
          const startChar = baseCharacter + match.index + match[0].indexOf(variableName);

          symbols.push(this.createSymbolInfo(
            variableName,
            this.getSymbolKind(declarationType),
            lineNumber,
            startChar,
            variableName.length,
            value
          ));
        } else if (pattern.type === 'destructuring') {
          const declarationType = match[1] as DeclarationType;
          const destructureContent = match[3];
          const destructuredVars = this.parseDestructuring(destructureContent);
          
          for (const varName of destructuredVars) {
            const varIndex = destructureContent.indexOf(varName);
            if (varIndex !== -1) {
              const startChar = baseCharacter + match.index + match[0].indexOf(destructureContent) + varIndex;
              
              symbols.push(this.createSymbolInfo(
                varName,
                this.getSymbolKind(declarationType),
                lineNumber,
                startChar,
                varName.length,
                undefined,
                'destructured'
              ));
            }
          }
        }
      }
    }

    // Process function parameter patterns
    for (const pattern of functionParamPatterns) {
      let match;
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(line)) !== null) {
        let paramString = '';
        
        if (pattern.type === 'single-arrow') {
          paramString = match[1];
        } else {
          paramString = match[1];
        }
        
        if (paramString) {
          const params = this.parseParameters(paramString);
          
          for (const param of params) {
            const paramIndex = paramString.indexOf(param);
            if (paramIndex !== -1) {
              const startChar = baseCharacter + match.index + match[0].indexOf(paramString) + paramIndex;
              
              symbols.push(this.createSymbolInfo(
                param,
                SymbolKind.Parameter,
                lineNumber,
                startChar,
                param.length,
                undefined,
                'parameter'
              ));
            }
          }
        }
      }
    }

    return symbols;
  }

  /**
   * Parse destructuring assignment to extract variable names
   * @param destructureContent The content inside {} or []
   * @returns Array of variable names
   */
  private parseDestructuring(destructureContent: string): string[] {
    const variables: string[] = [];
    
    // Simple destructuring: {a, b, c} or [x, y, z]
    const simplePattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    
    while ((match = simplePattern.exec(destructureContent)) !== null) {
      const varName = match[1];
      // Avoid duplicates and common keywords
      if (!variables.includes(varName) && !this.isKeyword(varName)) {
        variables.push(varName);
      }
    }
    
    return variables;
  }

  /**
   * Parse function parameters to extract parameter names
   * @param paramString The parameter string from function declaration
   * @returns Array of parameter names
   */
  private parseParameters(paramString: string): string[] {
    const params: string[] = [];
    
    // Split by comma and clean up each parameter
    const paramParts = paramString.split(',');
    
    for (const part of paramParts) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      
      // Handle destructured parameters: {a, b} or [x, y]
      if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
        const destructured = this.parseDestructuring(cleaned);
        params.push(...destructured);
      } else {
        // Simple parameter: extract just the name (ignore default values)
        const paramMatch = cleaned.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (paramMatch) {
          params.push(paramMatch[1]);
        }
      }
    }
    
    return params;
  }

  /**
   * Create a SymbolInfo object
   * @param name Variable name
   * @param kind Symbol kind
   * @param line Line number
   * @param character Character position
   * @param length Length of the symbol
   * @param value Optional value
   * @param declarationType Optional declaration type override
   * @returns SymbolInfo object
   */
  private createSymbolInfo(
    name: string,
    kind: SymbolKind,
    line: number,
    character: number,
    length: number,
    value?: string,
    declarationType?: DeclarationType
  ): SymbolInfo {
    const location: Location = {
      line,
      character,
      length
    };

    return {
      name,
      kind,
      location,
      definition: location, // For now, definition is the same as location
      references: [location], // Start with the definition as the first reference
      value
    };
  }

  /**
   * Get symbol kind based on declaration type
   * @param declarationType The declaration type
   * @returns Corresponding symbol kind
   */
  private getSymbolKind(declarationType: string): SymbolKind {
    switch (declarationType) {
      case 'const':
        return SymbolKind.Constant;
      case 'let':
      case 'var':
        return SymbolKind.Variable;
      default:
        return SymbolKind.Variable;
    }
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