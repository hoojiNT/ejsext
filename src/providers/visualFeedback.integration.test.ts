/**
 * Integration tests for EJS Visual Feedback with example file
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { EJSVisualFeedbackProvider } from './visualFeedbackProvider';
import { EJSParser } from '../parser/ejsParser';
import { SymbolAnalyzer } from '../analyzer/symbolAnalyzer';

// Mock VS Code API
const mockVSCode = {
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Range: class {
    constructor(
      public start: any,
      public end: any
    ) {}
  },
  DocumentHighlight: class {
    constructor(
      public range: any,
      public kind: any
    ) {}
  },
  DocumentHighlightKind: {
    Read: 1,
    Write: 2
  },
  TextDocument: class {
    constructor(
      public uri: any,
      public languageId: string,
      public version: number,
      public content: string
    ) {}
    
    getText(range?: any): string {
      if (!range) return this.content;
      const lines = this.content.split('\n');
      const startLine = range.start.line;
      const endLine = range.end.line;
      
      if (startLine === endLine) {
        return lines[startLine]?.substring(range.start.character, range.end.character) || '';
      }
      
      // Multi-line range
      let result = '';
      for (let i = startLine; i <= endLine; i++) {
        if (i === startLine) {
          result += lines[i]?.substring(range.start.character) || '';
        } else if (i === endLine) {
          result += '\n' + (lines[i]?.substring(0, range.end.character) || '');
        } else {
          result += '\n' + (lines[i] || '');
        }
      }
      return result;
    }
    
    getWordRangeAtPosition(position: any): any {
      const lines = this.content.split('\n');
      const line = lines[position.line];
      if (!line) return null;
      
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
      
      if (start === end) return null;
      
      return new mockVSCode.Range(
        new mockVSCode.Position(position.line, start),
        new mockVSCode.Position(position.line, end)
      );
    }
  }
};

// Apply mocks
Object.assign(global, { vscode: mockVSCode });

describe('EJS Visual Feedback Integration Tests', () => {
  let provider: EJSVisualFeedbackProvider;
  let parser: EJSParser;
  let symbolAnalyzer: SymbolAnalyzer;
  let exampleContent: string;

  beforeEach(() => {
    parser = new EJSParser();
    symbolAnalyzer = new SymbolAnalyzer();
    provider = new EJSVisualFeedbackProvider(parser, symbolAnalyzer);

    // Load the example EJS file
    const examplePath = path.join(process.cwd(), 'example', 'form-modal.ejs');
    try {
      exampleContent = fs.readFileSync(examplePath, 'utf-8');
    } catch (error) {
      // Fallback content if file doesn't exist
      exampleContent = `<% const _viewsPath = '/views'; %>
<% const title = 'Test Form'; %>
<% const formData = { name: '', email: '' }; %>

<div class="modal">
  <h1><%= title %></h1>
  <form>
    <input name="name" value="<%= formData.name %>">
    <input name="email" value="<%= formData.email %>">
  </form>
  <script>
    console.log('Views path: <%= _viewsPath %>');
  </script>
</div>`;
    }
  });

  describe('Visual feedback with example EJS file', () => {
    it('should provide highlights for _viewsPath variable', () => {
      const document = new mockVSCode.TextDocument(
        { toString: () => 'form-modal.ejs' },
        'ejs',
        1,
        exampleContent
      );

      // Find a position where _viewsPath is used (not defined)
      const lines = exampleContent.split('\n');
      let testPosition: any = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/_viewsPath/);
        if (match && !line.includes('const _viewsPath')) {
          // Found a usage, not a definition
          testPosition = new mockVSCode.Position(i, match.index! + 1);
          break;
        }
      }

      if (testPosition) {
        const token = { isCancellationRequested: false };
        const result = provider.provideDocumentHighlights(document as any, testPosition, token as any);
        
        expect(result).toBeDefined();
        if (Array.isArray(result)) {
          expect(result.length).toBeGreaterThan(0);
          
          // Should have at least one highlight for the definition
          const hasDefinitionHighlight = result.some(highlight => 
            highlight.kind === mockVSCode.DocumentHighlightKind.Write
          );
          expect(hasDefinitionHighlight).toBe(true);
        }
      }
    });

    it('should detect defined variables correctly', () => {
      const document = new mockVSCode.TextDocument(
        { toString: () => 'form-modal.ejs' },
        'ejs',
        1,
        exampleContent
      );

      // Find a position where a variable is used
      const lines = exampleContent.split('\n');
      let testPosition: any = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for variable usage in EJS output tags
        const match = line.match(/<%=\s*(\w+)/);
        if (match) {
          const variableName = match[1];
          const variableIndex = line.indexOf(variableName, match.index!);
          testPosition = new mockVSCode.Position(i, variableIndex + 1);
          break;
        }
      }

      if (testPosition) {
        const result = provider.isOverDefinedVariable(document as any, testPosition);
        expect(result).toBe(true);
      }
    });

    it('should return false for undefined variables', () => {
      const document = new mockVSCode.TextDocument(
        { toString: () => 'form-modal.ejs' },
        'ejs',
        1,
        exampleContent
      );

      // Create a position over a non-existent variable
      const modifiedContent = exampleContent + '\n<%= undefinedVariable %>';
      const modifiedDocument = new mockVSCode.TextDocument(
        { toString: () => 'form-modal.ejs' },
        'ejs',
        1,
        modifiedContent
      );

      const lines = modifiedContent.split('\n');
      const lastLine = lines[lines.length - 1];
      const variableIndex = lastLine.indexOf('undefinedVariable');
      const testPosition = new mockVSCode.Position(lines.length - 1, variableIndex + 1);

      const result = provider.isOverDefinedVariable(modifiedDocument as any, testPosition);
      expect(result).toBe(false);
    });

    it('should handle complex EJS expressions', () => {
      const complexContent = `<% 
        const config = { 
          apiUrl: 'https://api.example.com',
          timeout: 5000 
        }; 
        const { apiUrl, timeout } = config;
      %>
      <script>
        fetch('<%= apiUrl %>', { timeout: <%= timeout %> });
      </script>`;

      const document = new mockVSCode.TextDocument(
        { toString: () => 'complex.ejs' },
        'ejs',
        1,
        complexContent
      );

      // Test position over 'apiUrl' usage
      const lines = complexContent.split('\n');
      let testPosition: any = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/<%=\s*apiUrl/);
        if (match) {
          const variableIndex = line.indexOf('apiUrl', match.index!);
          testPosition = new mockVSCode.Position(i, variableIndex + 1);
          break;
        }
      }

      if (testPosition) {
        const result = provider.isOverDefinedVariable(document as any, testPosition);
        expect(result).toBe(true);

        const token = { isCancellationRequested: false };
        const highlights = provider.provideDocumentHighlights(document as any, testPosition, token as any);
        expect(highlights).toBeDefined();
        if (Array.isArray(highlights)) {
          expect(highlights.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Performance with large files', () => {
    it('should handle large EJS files efficiently', () => {
      // Create a large EJS file content
      let largeContent = '<% const baseUrl = "/api"; %>\n';
      for (let i = 0; i < 1000; i++) {
        largeContent += `<div>Item ${i}: <%= baseUrl %>/item/${i}</div>\n`;
      }

      const document = new mockVSCode.TextDocument(
        { toString: () => 'large.ejs' },
        'ejs',
        1,
        largeContent
      );

      const testPosition = new mockVSCode.Position(500, 25); // Middle of the file
      
      const startTime = Date.now();
      const result = provider.isOverDefinedVariable(document as any, testPosition);
      const endTime = Date.now();

      // Should complete within 500ms as per requirements
      expect(endTime - startTime).toBeLessThan(500);
      expect(result).toBe(true);
    });
  });
});