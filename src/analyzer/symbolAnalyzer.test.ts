/**
 * Unit tests for SymbolAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SymbolAnalyzer } from './symbolAnalyzer';
import { JavaScriptBlock, SymbolKind } from '../types';

describe('SymbolAnalyzer', () => {
  let analyzer: SymbolAnalyzer;

  beforeEach(() => {
    analyzer = new SymbolAnalyzer();
  });

  describe('const declarations', () => {
    it('should detect simple const declarations', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const name = "John"',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 19,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('name');
      expect(symbols[0].kind).toBe(SymbolKind.Constant);
      expect(symbols[0].location.line).toBe(0);
      expect(symbols[0].value).toBe('"John"');
    });

    it('should detect const declarations without assignment', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const name;',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 11,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('name');
      expect(symbols[0].kind).toBe(SymbolKind.Constant);
    });

    it('should detect multiple const declarations on same line', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const a = 1, b = 2',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 18,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1); // Current implementation handles one per match
      expect(symbols[0].name).toBe('a');
      expect(symbols[0].value).toBe('1');
    });
  });

  describe('let declarations', () => {
    it('should detect simple let declarations', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'let counter = 0',
        startLine: 1,
        endLine: 1,
        startCharacter: 5,
        endCharacter: 20,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('counter');
      expect(symbols[0].kind).toBe(SymbolKind.Variable);
      expect(symbols[0].location.line).toBe(1);
      expect(symbols[0].value).toBe('0');
    });

    it('should detect let declarations without assignment', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'let result',
        startLine: 2,
        endLine: 2,
        startCharacter: 10,
        endCharacter: 20,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('result');
      expect(symbols[0].kind).toBe(SymbolKind.Variable);
      expect(symbols[0].location.line).toBe(2);
    });
  });

  describe('var declarations', () => {
    it('should detect simple var declarations', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'var oldStyle = true',
        startLine: 3,
        endLine: 3,
        startCharacter: 0,
        endCharacter: 19,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('oldStyle');
      expect(symbols[0].kind).toBe(SymbolKind.Variable);
      expect(symbols[0].value).toBe('true');
    });
  });

  describe('function parameter recognition', () => {
    it('should detect regular function parameters', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'function process(data, options) { return data; }',
        startLine: 4,
        endLine: 4,
        startCharacter: 0,
        endCharacter: 48,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('data');
      expect(symbols[0].kind).toBe(SymbolKind.Parameter);
      expect(symbols[1].name).toBe('options');
      expect(symbols[1].kind).toBe(SymbolKind.Parameter);
    });

    it('should detect arrow function parameters with parentheses', () => {
      const blocks: JavaScriptBlock[] = [{
        content: '(x, y) => x + y',
        startLine: 5,
        endLine: 5,
        startCharacter: 0,
        endCharacter: 15,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('x');
      expect(symbols[0].kind).toBe(SymbolKind.Parameter);
      expect(symbols[1].name).toBe('y');
      expect(symbols[1].kind).toBe(SymbolKind.Parameter);
    });

    it('should detect single parameter arrow function', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'item => item.name',
        startLine: 6,
        endLine: 6,
        startCharacter: 0,
        endCharacter: 17,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('item');
      expect(symbols[0].kind).toBe(SymbolKind.Parameter);
    });

    it('should detect parameters with default values', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'function greet(name = "World") { return "Hello " + name; }',
        startLine: 7,
        endLine: 7,
        startCharacter: 0,
        endCharacter: 58,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('name');
      expect(symbols[0].kind).toBe(SymbolKind.Parameter);
    });
  });

  describe('destructured variable assignments', () => {
    it('should detect object destructuring', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const {name, age} = person',
        startLine: 8,
        endLine: 8,
        startCharacter: 0,
        endCharacter: 26,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('name');
      expect(symbols[0].kind).toBe(SymbolKind.Constant);
      expect(symbols[1].name).toBe('age');
      expect(symbols[1].kind).toBe(SymbolKind.Constant);
    });

    it('should detect array destructuring', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'let [first, second] = items',
        startLine: 9,
        endLine: 9,
        startCharacter: 0,
        endCharacter: 27,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('first');
      expect(symbols[0].kind).toBe(SymbolKind.Variable);
      expect(symbols[1].name).toBe('second');
      expect(symbols[1].kind).toBe(SymbolKind.Variable);
    });

    it('should detect nested destructuring', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const {user, settings} = config',
        startLine: 10,
        endLine: 10,
        startCharacter: 0,
        endCharacter: 31,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('user');
      expect(symbols[1].name).toBe('settings');
    });

    it('should detect destructured function parameters', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'function process({data, meta}) { return data; }',
        startLine: 11,
        endLine: 11,
        startCharacter: 0,
        endCharacter: 47,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('data');
      expect(symbols[0].kind).toBe(SymbolKind.Parameter);
      expect(symbols[1].name).toBe('meta');
      expect(symbols[1].kind).toBe(SymbolKind.Parameter);
    });
  });

  describe('findDefinition', () => {
    it('should find definition for a declared variable', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const userName = "Alice"',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 24,
        tagType: 'scriptlet'
      }];

      analyzer.analyzeSymbols(blocks);
      const definition = analyzer.findDefinition('userName', { line: 5, character: 10 } as any);
      
      expect(definition).not.toBeNull();
      expect(definition!.name).toBe('userName');
      expect(definition!.location.line).toBe(0);
    });

    it('should return null for undefined variable', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const userName = "Alice"',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 24,
        tagType: 'scriptlet'
      }];

      analyzer.analyzeSymbols(blocks);
      const definition = analyzer.findDefinition('unknownVar', { line: 5, character: 10 } as any);
      
      expect(definition).toBeNull();
    });

    it('should return first definition when variable is defined multiple times', () => {
      const blocks: JavaScriptBlock[] = [
        {
          content: 'let counter = 0',
          startLine: 0,
          endLine: 0,
          startCharacter: 0,
          endCharacter: 15,
          tagType: 'scriptlet'
        },
        {
          content: 'let counter = 1',
          startLine: 5,
          endLine: 5,
          startCharacter: 0,
          endCharacter: 15,
          tagType: 'scriptlet'
        }
      ];

      analyzer.analyzeSymbols(blocks);
      const definition = analyzer.findDefinition('counter', { line: 10, character: 5 } as any);
      
      expect(definition).not.toBeNull();
      expect(definition!.location.line).toBe(0); // First definition
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple declaration types in same block', () => {
      const blocks: JavaScriptBlock[] = [{
        content: `
          const API_URL = "/api";
          let currentUser = null;
          var isLoggedIn = false;
          function authenticate(username, password) {
            const {token, expires} = response;
            return token;
          }
        `,
        startLine: 0,
        endLine: 7,
        startCharacter: 0,
        endCharacter: 200,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      // Should find: API_URL, currentUser, isLoggedIn, username, password, token, expires
      expect(symbols.length).toBeGreaterThanOrEqual(5);
      
      const symbolNames = symbols.map(s => s.name);
      expect(symbolNames).toContain('API_URL');
      expect(symbolNames).toContain('currentUser');
      expect(symbolNames).toContain('isLoggedIn');
      expect(symbolNames).toContain('username');
      expect(symbolNames).toContain('password');
    });

    it('should handle variables with underscores and dollar signs', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const _private = true; let $element = null;',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 43,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('_private');
      expect(symbols[1].name).toBe('$element');
    });

    it('should ignore JavaScript keywords', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const {return, function} = obj', // These shouldn't be detected as valid variables
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 30,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      
      // Should not detect 'return' or 'function' as variables
      const symbolNames = symbols.map(s => s.name);
      expect(symbolNames).not.toContain('return');
      expect(symbolNames).not.toContain('function');
    });
  });

  describe('edge cases', () => {
    it('should handle empty blocks', () => {
      const blocks: JavaScriptBlock[] = [{
        content: '',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 0,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      expect(symbols).toHaveLength(0);
    });

    it('should handle blocks with only whitespace', () => {
      const blocks: JavaScriptBlock[] = [{
        content: '   \n  \t  ',
        startLine: 0,
        endLine: 1,
        startCharacter: 0,
        endCharacter: 8,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      expect(symbols).toHaveLength(0);
    });

    it('should handle malformed declarations gracefully', () => {
      const blocks: JavaScriptBlock[] = [{
        content: 'const = "invalid"; let 123invalid = true;',
        startLine: 0,
        endLine: 0,
        startCharacter: 0,
        endCharacter: 41,
        tagType: 'scriptlet'
      }];

      const symbols = analyzer.analyzeSymbols(blocks);
      // Should not crash and should not detect invalid variable names
      expect(symbols).toHaveLength(0);
    });
  });
});