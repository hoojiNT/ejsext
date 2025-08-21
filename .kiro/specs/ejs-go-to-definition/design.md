# Design Document

## Overview

The EJS Go to Definition feature will extend the existing EJS syntax highlighting extension to provide intelligent navigation capabilities. This will be implemented using VS Code's Language Server Protocol (LSP) features, specifically the Definition Provider API and Hover Provider API.

The solution will parse EJS files to identify variable definitions and usages, then provide navigation and hover information through VS Code's built-in mechanisms.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VS Code UI    │◄──►│  Extension Host  │◄──►│  EJS Language   │
│                 │    │                  │    │    Provider     │
│ - Editor        │    │ - Definition     │    │                 │
│ - Hover         │    │   Provider       │    │ - Parser        │
│ - Navigation    │    │ - Hover Provider │    │ - Symbol Cache  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Architecture

1. **EJS Parser**: Analyzes EJS template content to extract JavaScript code blocks and identify variables
2. **Symbol Analyzer**: Processes parsed content to identify variable definitions and references
3. **Definition Provider**: Implements VS Code's DefinitionProvider interface
4. **Hover Provider**: Implements VS Code's HoverProvider interface
5. **Symbol Cache**: Caches parsed symbols for performance optimization

## Components and Interfaces

### EJS Parser

**Purpose**: Extract and parse JavaScript code from EJS templates

**Interface**:
```typescript
interface EJSParser {
  parseDocument(document: TextDocument): ParsedEJSDocument;
  extractJavaScriptBlocks(content: string): JavaScriptBlock[];
}

interface JavaScriptBlock {
  content: string;
  startLine: number;
  endLine: number;
  startCharacter: number;
  endCharacter: number;
  tagType: 'scriptlet' | 'output' | 'unescaped';
}

interface ParsedEJSDocument {
  jsBlocks: JavaScriptBlock[];
  symbols: SymbolInfo[];
}
```

### Symbol Analyzer

**Purpose**: Identify variable definitions and references within JavaScript blocks

**Interface**:
```typescript
interface SymbolAnalyzer {
  analyzeSymbols(jsBlocks: JavaScriptBlock[]): SymbolInfo[];
  findDefinition(symbolName: string, position: Position): SymbolInfo | null;
}

interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  location: Location;
  definition: Location;
  references: Location[];
  value?: string;
}
```

### Definition Provider

**Purpose**: Provide Go to Definition functionality for EJS variables

**Interface**:
```typescript
class EJSDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition>;
}
```

### Hover Provider

**Purpose**: Provide hover information for EJS variables

**Interface**:
```typescript
class EJSHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover>;
}
```

## Data Models

### Symbol Information Model

```typescript
enum SymbolKind {
  Variable = 'variable',
  Constant = 'constant',
  Parameter = 'parameter',
  Property = 'property'
}

interface Location {
  line: number;
  character: number;
  length: number;
}

interface SymbolDefinition {
  name: string;
  kind: SymbolKind;
  location: Location;
  declarationType: 'const' | 'let' | 'var' | 'parameter' | 'destructured';
  value?: string;
  scope: 'global' | 'block' | 'function';
}
```

### Document Cache Model

```typescript
interface DocumentCache {
  uri: string;
  version: number;
  symbols: Map<string, SymbolDefinition[]>;
  lastParsed: number;
}
```

## Error Handling

### Parser Errors
- **Invalid EJS Syntax**: Log warning and continue parsing valid blocks
- **Malformed JavaScript**: Skip problematic blocks and continue processing
- **Large File Handling**: Implement timeout mechanism for files over 10MB

### Provider Errors
- **Symbol Not Found**: Return null/undefined to let VS Code handle gracefully
- **Multiple Definitions**: Return the first definition found in document order
- **Performance Timeout**: Cancel operation after 500ms and return partial results

### User-Facing Errors
- **No Definition Found**: Show subtle notification "No definition found for variable"
- **Parse Errors**: Log to output channel but don't interrupt user workflow

## Testing Strategy

### Unit Tests
1. **EJS Parser Tests**
   - Test parsing of different EJS tag types (`<% %>`, `<%- %>`, `<%= %>`)
   - Test extraction of JavaScript blocks with correct line/character positions
   - Test handling of nested templates and complex expressions

2. **Symbol Analyzer Tests**
   - Test variable definition detection for `const`, `let`, `var`
   - Test destructuring assignment recognition
   - Test function parameter identification
   - Test scope resolution and variable shadowing

3. **Provider Tests**
   - Test Definition Provider with various variable types
   - Test Hover Provider information accuracy
   - Test performance with large files
   - Test edge cases (variables in comments, strings, etc.)

### Integration Tests
1. **VS Code Extension Tests**
   - Test Go to Definition functionality in real EJS files
   - Test hover information display
   - Test performance with the example form-modal.ejs file
   - Test multi-file scenarios (though initially focusing on single-file)

### Performance Tests
1. **Benchmark Tests**
   - Measure parsing time for files of various sizes
   - Test symbol lookup performance
   - Test cache effectiveness
   - Ensure sub-500ms response time for large files

### Manual Testing Scenarios
1. Test with the provided `form-modal.ejs` example file
2. Test Ctrl+click on `_viewsPath` variable (line 1 definition, line 25+ usage)
3. Test hover information display
4. Test with variables that have multiple definitions
5. Test with variables used in different EJS tag types

## Implementation Phases

### Phase 1: Core Parser and Symbol Analysis
- Implement EJS parser to extract JavaScript blocks
- Implement symbol analyzer for basic variable definitions
- Add unit tests for parsing functionality

### Phase 2: Definition Provider
- Implement VS Code Definition Provider
- Add Go to Definition functionality
- Test with example EJS file

### Phase 3: Hover Provider and Polish
- Implement Hover Provider for variable information
- Add visual feedback (cursor changes, highlighting)
- Implement caching for performance

### Phase 4: Advanced Features and Optimization
- Add support for destructured variables
- Implement performance optimizations
- Add comprehensive error handling