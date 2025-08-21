# Design Document

## Overview

The EJS syntax highlighting improvement will enhance the existing TextMate grammar to properly handle string interpolation, template literals, and complex JavaScript expressions within EJS tags. This will be achieved by extending the current `ejs.tmLanguage.json` grammar with more sophisticated patterns and rules.

The solution focuses on improving the JavaScript syntax recognition within EJS tags while maintaining compatibility with existing HTML highlighting.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VS Code       │◄──►│  TextMate        │◄──►│  EJS Grammar    │
│   Editor        │    │  Grammar Engine  │    │                 │
│                 │    │                  │    │ - Enhanced JS   │
│ - Syntax        │    │ - Pattern        │    │   Patterns      │
│   Highlighting  │    │   Matching       │    │ - String        │
│ - Error         │    │ - Scope          │    │   Interpolation │
│   Detection     │    │   Assignment     │    │ - Complex Expr  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Architecture

1. **Enhanced JavaScript Patterns**: Improved regex patterns for JavaScript syntax within EJS tags
2. **String Interpolation Handler**: Specialized patterns for template literals and string interpolation
3. **Complex Expression Parser**: Patterns for nested expressions, ternary operators, and function calls
4. **Error Detection**: Patterns to identify and highlight syntax errors
5. **Scope Management**: Proper scope assignment for different syntax elements

## Components and Interfaces

### Enhanced JavaScript Patterns

**Purpose**: Provide more detailed JavaScript syntax highlighting within EJS tags

**Implementation**:
```json
{
  "ejs-javascript-enhanced": {
    "patterns": [
      { "include": "#template-literals" },
      { "include": "#string-interpolation" },
      { "include": "#complex-expressions" },
      { "include": "#javascript-keywords" },
      { "include": "#javascript-operators" },
      { "include": "source.js" }
    ]
  }
}
```

### String Interpolation Handler

**Purpose**: Handle template literals and string interpolation within EJS expressions

**Implementation**:
```json
{
  "template-literals": {
    "name": "string.template.js",
    "begin": "`",
    "end": "`",
    "patterns": [
      {
        "name": "meta.template.expression.js",
        "begin": "\\$\\{",
        "end": "\\}",
        "patterns": [
          { "include": "#ejs-javascript-enhanced" }
        ]
      }
    ]
  }
}
```

### Complex Expression Parser

**Purpose**: Handle nested expressions, ternary operators, and function calls

**Implementation**:
```json
{
  "complex-expressions": {
    "patterns": [
      { "include": "#ternary-operators" },
      { "include": "#function-calls" },
      { "include": "#method-chaining" },
      { "include": "#logical-operators" }
    ]
  }
}
```

## Data Models

### Grammar Pattern Structure

```json
{
  "pattern-name": {
    "name": "scope.name.for.highlighting",
    "begin": "regex-pattern-start",
    "end": "regex-pattern-end",
    "beginCaptures": {
      "0": { "name": "punctuation.scope" }
    },
    "endCaptures": {
      "0": { "name": "punctuation.scope" }
    },
    "patterns": [
      { "include": "#nested-patterns" }
    ]
  }
}
```

### Scope Naming Convention

```typescript
interface ScopeNames {
  templateLiteral: 'string.template.js';
  interpolation: 'meta.template.expression.js';
  ternaryOperator: 'keyword.operator.ternary.js';
  functionCall: 'meta.function-call.js';
  methodChain: 'meta.method-call.js';
  logicalOperator: 'keyword.operator.logical.js';
  stringQuoted: 'string.quoted.single.js' | 'string.quoted.double.js';
}
```

## Error Handling

### Grammar Pattern Errors
- **Unmatched Quotes**: Use negative lookahead patterns to detect unclosed strings
- **Unmatched Brackets**: Implement balanced bracket matching patterns
- **Invalid Interpolation**: Detect malformed `${}` syntax in template literals

### Fallback Mechanisms
- **Pattern Matching Failure**: Fall back to basic `source.js` inclusion
- **Complex Expression Overflow**: Limit nesting depth to prevent infinite recursion
- **Performance Issues**: Implement pattern timeouts for complex expressions

### Error Highlighting
- **Syntax Errors**: Use `invalid.illegal` scope for malformed syntax
- **Incomplete Expressions**: Use `invalid.incomplete` scope for partial expressions
- **Deprecated Syntax**: Use `invalid.deprecated` scope for outdated patterns

## Testing Strategy

### Grammar Testing
1. **Pattern Matching Tests**
   - Test template literal recognition with various quote combinations
   - Test string interpolation with nested expressions
   - Test complex ternary operators with multiple levels
   - Test function calls with multiple parameters and method chaining

2. **Scope Assignment Tests**
   - Verify correct scope names are assigned to different syntax elements
   - Test scope boundaries for nested expressions
   - Validate scope inheritance for complex patterns

3. **Error Detection Tests**
   - Test highlighting of unmatched quotes and brackets
   - Test detection of malformed template literals
   - Test identification of incomplete expressions

### Integration Tests
1. **VS Code Integration**
   - Test syntax highlighting in actual VS Code editor
   - Verify theme compatibility with new scopes
   - Test performance with large EJS files containing complex expressions

2. **Real-world Examples**
   - Test with the problematic line from form-modal.ejs
   - Test with various EJS templates containing string interpolation
   - Test with nested ternary operators and function calls

### Performance Tests
1. **Large File Handling**
   - Test grammar performance with files containing hundreds of complex expressions
   - Measure highlighting response time for real-time editing
   - Test memory usage with deeply nested expressions

## Implementation Phases

### Phase 1: Enhanced String Handling
- Implement improved template literal patterns
- Add string interpolation recognition
- Test with basic template literal examples

### Phase 2: Complex Expression Support
- Add ternary operator patterns
- Implement function call recognition
- Add method chaining support

### Phase 3: Error Detection and Validation
- Implement error highlighting patterns
- Add validation for malformed syntax
- Test error detection with various invalid expressions

### Phase 4: Performance Optimization and Polish
- Optimize regex patterns for performance
- Add comprehensive testing
- Validate with real-world EJS templates

## Grammar Pattern Examples

### Template Literal with Interpolation
```javascript
// Input: `Hello ${name}, you have ${count} messages`
// Should highlight:
// - Backticks as string delimiters
// - ${} as interpolation punctuation
// - Variables inside interpolation as identifiers
```

### Complex Ternary Expression
```javascript
// Input: condition ? `value: ${x}` : y > 0 ? `positive: ${y}` : 'zero'
// Should highlight:
// - ? and : as ternary operators
// - Template literals with proper string scoping
// - Comparison operators
// - Variables and literals
```

### Function Call with String Interpolation
```javascript
// Input: processUrl({url: `${base}/${path}`, size: '120x120'})
// Should highlight:
// - Function name as function call
// - Object literal syntax
// - Template literal with interpolation
// - String literals
```