/**
 * Integration tests for EJS Hover Provider with real EJS content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EJSHoverProvider } from './hoverProvider';
import { EJSParser } from '../parser/ejsParser';
import { SymbolAnalyzer } from '../analyzer/symbolAnalyzer';

// Mock VS Code API
vi.mock('vscode', () => ({
  Position: vi.fn().mockImplementation((line: number, character: number) => ({ line, character })),
  Range: vi.fn().mockImplementation((start: any, end: any) => ({ start, end })),
  Location: vi.fn().mockImplementation((uri: any, position: any) => ({ uri, range: position })),
  Hover: vi.fn().mockImplementation((contents: any, range: any) => ({ contents, range })),
  MarkdownString: vi.fn().mockImplementation(() => ({
    isTrusted: false,
    appendCodeblock: vi.fn(),
    appendMarkdown: vi.fn(),
  })),
  CancellationToken: {
    isCancellationRequested: false,
  },
}));

describe('EJSHoverProvider Integration', () => {
  let hoverProvider: EJSHoverProvider;
  let parser: EJSParser;
  let symbolAnalyzer: SymbolAnalyzer;

  beforeEach(() => {
    parser = new EJSParser();
    symbolAnalyzer = new SymbolAnalyzer();
    hoverProvider = new EJSHoverProvider(parser, symbolAnalyzer);
  });

  it('should provide hover information for _viewsPath variable in example EJS file', () => {
    // Sample EJS content similar to the example file
    const ejsContent = `<% const _viewsPath = '../../../..'; %>
<% const _editing = (typeof editing !== 'undefined' && editing) ? editing : {}; %>
<% const _socialChannel = _editing?.socialChannel || {}; %>

<div class="modal modal-lg fade" id="modal-salestream-channel-form">
  <div class="modal-dialog modal-dialog-scrollable">
    <form id="frmSalestreamChannel" data-id="<%= _editing?.id || '' %>">
      <div class="modal-content">
        <div class="modal-header">
          <strong class="modal-title"><%= _editing?.id ? 'Edit' : 'Add' %></strong>
          <%- include(\`\${_viewsPath}/components/ui/buttons/index.ejs\`, {
            type: 'button',
            buttonType: 'plain'
          }); %>
        </div>
      </div>
    </form>
  </div>
</div>`;

    // Create mock document
    const mockDocument = {
      uri: { fsPath: '/test/form-modal.ejs' },
      getText: (range?: any) => {
        if (range) {
          // For getWordRangeAtPosition, return the word at that position
          return '_viewsPath';
        }
        return ejsContent;
      },
      getWordRangeAtPosition: () => ({
        start: { line: 10, character: 23 },
        end: { line: 10, character: 33 }
      }),
      lineCount: ejsContent.split('\n').length,
      lineAt: (line: number) => ({
        text: ejsContent.split('\n')[line] || '',
        lineNumber: line,
        range: { start: { line, character: 0 }, end: { line, character: 100 } },
        rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: false
      })
    } as any;

    // Position where _viewsPath is used (line 10, around character 25)
    const position = { line: 10, character: 25 } as any;
    const cancellationToken = { isCancellationRequested: false } as any;

    // Call provideHover
    const result = hoverProvider.provideHover(mockDocument, position, cancellationToken);

    // Verify result
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    
    if (result && typeof result === 'object' && 'contents' in result) {
      const hover = result as any;
      expect(hover.contents).toBeDefined();
    }
  });

  it('should provide hover information for _editing variable', () => {
    const ejsContent = `<% const _viewsPath = '../../../..'; %>
<% const _editing = (typeof editing !== 'undefined' && editing) ? editing : {}; %>
<% const _socialChannel = _editing?.socialChannel || {}; %>

<div>
  <span><%= _editing?.id || '' %></span>
</div>`;

    const mockDocument = {
      uri: { fsPath: '/test/form-modal.ejs' },
      getText: (range?: any) => {
        if (range) {
          return '_editing';
        }
        return ejsContent;
      },
      getWordRangeAtPosition: () => ({
        start: { line: 5, character: 14 },
        end: { line: 5, character: 22 }
      }),
      lineCount: ejsContent.split('\n').length,
      lineAt: (line: number) => ({
        text: ejsContent.split('\n')[line] || '',
        lineNumber: line,
        range: { start: { line, character: 0 }, end: { line, character: 100 } },
        rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: false
      })
    } as any;

    const position = { line: 5, character: 18 } as any;
    const cancellationToken = { isCancellationRequested: false } as any;

    const result = hoverProvider.provideHover(mockDocument, position, cancellationToken);

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });

  it('should return null for variables not inside EJS blocks', () => {
    const ejsContent = `<% const _viewsPath = '../../../..'; %>
<div class="modal">
  <span>Some regular HTML content with variable-like text</span>
</div>`;

    const mockDocument = {
      uri: { fsPath: '/test/form-modal.ejs' },
      getText: () => ejsContent,
      getWordRangeAtPosition: () => ({
        start: { line: 2, character: 30 },
        end: { line: 2, character: 38 }
      }),
      lineCount: ejsContent.split('\n').length,
      lineAt: (line: number) => ({
        text: ejsContent.split('\n')[line] || '',
        lineNumber: line,
        range: { start: { line, character: 0 }, end: { line, character: 100 } },
        rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: false
      })
    } as any;

    // Position in regular HTML content (not in EJS block)
    const position = { line: 2, character: 35 } as any;
    const cancellationToken = { isCancellationRequested: false } as any;

    const result = hoverProvider.provideHover(mockDocument, position, cancellationToken);

    expect(result).toBeNull();
  });
});