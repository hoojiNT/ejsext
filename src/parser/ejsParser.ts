/**
 * EJS template parser for extracting JavaScript blocks
 */

import * as vscode from 'vscode';
import { IEJSParser } from '../interfaces';
import { JavaScriptBlock, ParsedEJSDocument } from '../types';

/**
 * Parses EJS templates to extract JavaScript code blocks and identify symbols
 */
export class EJSParser implements IEJSParser {
  /**
   * Parse an EJS document and extract JavaScript blocks and symbols
   * @param document The VS Code text document to parse
   * @returns Parsed document with JavaScript blocks and symbols
   */
  parseDocument(document: vscode.TextDocument): ParsedEJSDocument {
    const content = document.getText();
    const jsBlocks = this.extractJavaScriptBlocks(content);
    
    // Note: Symbol analysis will be implemented in a later task
    // For now, return empty symbols array
    return {
      jsBlocks,
      symbols: []
    };
  }

  /**
   * Extract JavaScript code blocks from EJS template content
   * @param content The EJS template content as string
   * @returns Array of JavaScript blocks found in the template
   */
  extractJavaScriptBlocks(content: string): JavaScriptBlock[] {
    const blocks: JavaScriptBlock[] = [];
    const lines = content.split('\n');
    
    // Regex patterns for different EJS tag types
    const patterns = [
      {
        // Scriptlet tags: <% code %>
        regex: /<%\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
        tagType: 'scriptlet' as const
      },
      {
        // Unescaped output tags: <%- expression %>
        regex: /<%-\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
        tagType: 'unescaped' as const
      },
      {
        // Escaped output tags: <%= expression %>
        regex: /<%=\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
        tagType: 'output' as const
      }
    ];

    // Process each pattern
    for (const pattern of patterns) {
      let match;
      pattern.regex.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const jsCode = match[1].trim();
        
        // Skip empty blocks
        if (!jsCode) {
          continue;
        }
        
        // Calculate position information
        const startIndex = match.index;
        const endIndex = startIndex + fullMatch.length;
        
        // Find line and character positions
        const startPos = this.getLineAndCharacter(content, startIndex);
        const endPos = this.getLineAndCharacter(content, endIndex);
        
        // Calculate the actual JavaScript content position within the tag
        const jsStartIndex = startIndex + fullMatch.indexOf(jsCode);
        const jsStartPos = this.getLineAndCharacter(content, jsStartIndex);
        
        blocks.push({
          content: jsCode,
          startLine: jsStartPos.line,
          endLine: jsStartPos.line + (jsCode.split('\n').length - 1),
          startCharacter: jsStartPos.character,
          endCharacter: jsStartPos.character + jsCode.length,
          tagType: pattern.tagType
        });
      }
    }
    
    // Sort blocks by position for consistent ordering
    return blocks.sort((a, b) => {
      if (a.startLine !== b.startLine) {
        return a.startLine - b.startLine;
      }
      return a.startCharacter - b.startCharacter;
    });
  }

  /**
   * Convert string index to line and character position
   * @param content The full content string
   * @param index The character index to convert
   * @returns Line and character position (0-based)
   */
  private getLineAndCharacter(content: string, index: number): { line: number; character: number } {
    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    return {
      line: lines.length - 1,
      character: lines[lines.length - 1].length
    };
  }
}