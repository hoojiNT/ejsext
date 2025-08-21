/**
 * Unit tests for EJS Parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EJSParser } from './ejsParser';
import { JavaScriptBlock, EJSTagType } from '../types';

describe('EJSParser', () => {
  let parser: EJSParser;

  beforeEach(() => {
    parser = new EJSParser();
  });

  describe('extractJavaScriptBlocks', () => {
    it('should extract scriptlet tags (<% %>)', () => {
      const content = '<% const name = "test"; %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        content: 'const name = "test";',
        startLine: 0,
        endLine: 0,
        startCharacter: 3,
        endCharacter: 23,
        tagType: 'scriptlet'
      });
    });

    it('should extract unescaped output tags (<%- %>)', () => {
      const content = '<%- variable %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        content: 'variable',
        startLine: 0,
        endLine: 0,
        startCharacter: 4,
        endCharacter: 12,
        tagType: 'unescaped'
      });
    });

    it('should extract escaped output tags (<%= %>)', () => {
      const content = '<%= expression %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        content: 'expression',
        startLine: 0,
        endLine: 0,
        startCharacter: 4,
        endCharacter: 14,
        tagType: 'output'
      });
    });

    it('should handle multiple tag types in the same content', () => {
      const content = `
<% const name = "test"; %>
<%= name %>
<%- rawHtml %>
      `.trim();

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(3);
      
      // First block (scriptlet)
      expect(blocks[0].content).toBe('const name = "test";');
      expect(blocks[0].tagType).toBe('scriptlet');
      expect(blocks[0].startLine).toBe(0);
      
      // Second block (output)
      expect(blocks[1].content).toBe('name');
      expect(blocks[1].tagType).toBe('output');
      expect(blocks[1].startLine).toBe(1);
      
      // Third block (unescaped)
      expect(blocks[2].content).toBe('rawHtml');
      expect(blocks[2].tagType).toBe('unescaped');
      expect(blocks[2].startLine).toBe(2);
    });

    it('should handle multiline JavaScript blocks', () => {
      const content = `<%
        const obj = {
          name: "test",
          value: 123
        };
      %>`;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toContain('const obj = {');
      expect(blocks[0].content).toContain('name: "test"');
      expect(blocks[0].content).toContain('value: 123');
      expect(blocks[0].tagType).toBe('scriptlet');
      
      // The JavaScript content starts after the opening tag on the first line
      // So the actual JS content starts on line 1, not line 0
      expect(blocks[0].startLine).toBe(1);
      expect(blocks[0].endLine).toBe(4); // Multiline content
    });

    it('should handle complex expressions with nested quotes', () => {
      const content = `<%= _editing?.id ? 'Edit channel' : 'Add new channel' %>`;
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toBe(`_editing?.id ? 'Edit channel' : 'Add new channel'`);
      expect(blocks[0].tagType).toBe('output');
    });

    it('should handle template literals within EJS tags', () => {
      const content = '<%- include(`${_viewsPath}/components/ui/buttons/index.ejs`) %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toBe('include(`${_viewsPath}/components/ui/buttons/index.ejs`)');
      expect(blocks[0].tagType).toBe('unescaped');
    });

    it('should handle function calls with object parameters', () => {
      const content = `<%- include(\`\${_viewsPath}/components/ui/forms/input.ejs\`, {
        type: 'text',
        id: 'url',
        name: 'url',
        label: 'YouTube Channel'
      }); %>`;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toContain('include(');
      expect(blocks[0].content).toContain('type: \'text\'');
      expect(blocks[0].tagType).toBe('unescaped');
    });

    it('should skip empty blocks', () => {
      const content = '<% %> <%= %> <%- %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(0);
    });

    it('should handle blocks with only whitespace', () => {
      const content = '<%   %> <%=   %> <%-   %>';
      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(0);
    });

    it('should sort blocks by position', () => {
      const content = `
        <div><%= variable2 %></div>
        <% const variable1 = "test"; %>
        <%- variable3 %>
      `;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].content).toBe('variable2');
      expect(blocks[1].content).toBe('const variable1 = "test";');
      expect(blocks[2].content).toBe('variable3');
    });

    it('should handle complex real-world example', () => {
      const content = `<% const _viewsPath = '../../../..'; %>
<% const _editing = (typeof editing !== 'undefined' && editing) ? editing : {}; %>
<div class="modal-title"><%= _editing?.id ? 'Edit channel' : 'Add new channel' %></div>
<%- include(\`\${_viewsPath}/components/ui/buttons/index.ejs\`, {
  type: 'button',
  buttonType: 'plain'
}); %>`;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(4);
      
      // First scriptlet
      expect(blocks[0].content).toBe(`const _viewsPath = '../../../..';`);
      expect(blocks[0].tagType).toBe('scriptlet');
      
      // Second scriptlet
      expect(blocks[1].content).toBe(`const _editing = (typeof editing !== 'undefined' && editing) ? editing : {};`);
      expect(blocks[1].tagType).toBe('scriptlet');
      
      // Output expression
      expect(blocks[2].content).toBe(`_editing?.id ? 'Edit channel' : 'Add new channel'`);
      expect(blocks[2].tagType).toBe('output');
      
      // Include function call
      expect(blocks[3].content).toContain('include(');
      expect(blocks[3].tagType).toBe('unescaped');
    });

    it('should calculate correct line and character positions', () => {
      const content = `Line 1
<% const test = "value"; %>
Line 3
<%= variable %>`;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(2);
      
      // First block on line 1 (0-based)
      expect(blocks[0].startLine).toBe(1);
      expect(blocks[0].startCharacter).toBe(3); // After "<%"
      
      // Second block on line 3 (0-based)
      expect(blocks[1].startLine).toBe(3);
      expect(blocks[1].startCharacter).toBe(4); // After "<%="
    });

    it('should handle forEach loops and complex JavaScript', () => {
      const content = `<% _socialChannelSortableStatistics.forEach(item => { %>
  <% if (Number(item[1])) { %>
    <div><%= item[0] %></div>
  <% } %>
<% }); %>`;

      const blocks = parser.extractJavaScriptBlocks(content);

      expect(blocks).toHaveLength(5);
      expect(blocks[0].content).toBe('_socialChannelSortableStatistics.forEach(item => {');
      expect(blocks[1].content).toBe('if (Number(item[1])) {');
      expect(blocks[2].content).toBe('item[0]');
      expect(blocks[3].content).toBe('}');
      expect(blocks[4].content).toBe('});');
    });
  });

  describe('parseDocument', () => {
    it('should parse a VS Code document and return JavaScript blocks', () => {
      // Mock VS Code TextDocument
      const mockDocument = {
        getText: () => '<% const test = "value"; %>\n<%= test %>'
      } as any;

      const result = parser.parseDocument(mockDocument);

      expect(result.jsBlocks).toHaveLength(2);
      expect(result.jsBlocks[0].content).toBe('const test = "value";');
      expect(result.jsBlocks[1].content).toBe('test');
      expect(result.symbols).toEqual([]); // Symbols will be implemented later
    });

    it('should handle empty document', () => {
      const mockDocument = {
        getText: () => ''
      } as any;

      const result = parser.parseDocument(mockDocument);

      expect(result.jsBlocks).toHaveLength(0);
      expect(result.symbols).toEqual([]);
    });

    it('should handle document with no EJS tags', () => {
      const mockDocument = {
        getText: () => '<div>Regular HTML content</div>'
      } as any;

      const result = parser.parseDocument(mockDocument);

      expect(result.jsBlocks).toHaveLength(0);
      expect(result.symbols).toEqual([]);
    });
  });
});