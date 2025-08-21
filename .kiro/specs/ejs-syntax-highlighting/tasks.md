# Implementation Plan

- [ ] 1. Create enhanced JavaScript pattern structure
  - Add new `ejs-javascript-enhanced` pattern to the grammar repository
  - Define pattern hierarchy for template literals, string interpolation, and complex expressions
  - Update existing EJS tag patterns to use enhanced JavaScript patterns instead of basic `source.js`
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Implement template literal and string interpolation patterns
  - Create `template-literals` pattern with proper begin/end matching for backticks
  - Implement `string-interpolation` pattern to handle `${}` syntax within template literals
  - Add nested pattern support for JavaScript expressions within interpolation blocks
  - Create scope names for template literal strings and interpolation punctuation
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Add complex expression parsing patterns
  - Implement `ternary-operators` pattern to highlight `?` and `:` operators distinctly
  - Create `function-calls` pattern to highlight function names and parameter lists
  - Add `method-chaining` pattern for object property access and method calls
  - Implement `logical-operators` pattern for `&&`, `||`, and other logical operators
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Enhance JavaScript keyword and operator highlighting
  - Create `javascript-keywords` pattern for keywords like const, let, var, if, else, return
  - Implement `javascript-operators` pattern for comparison operators (===, !==, >, <, >=, <=)
  - Add arithmetic operator patterns (+, -, *, /, %)
  - Create assignment operator patterns (=, +=, -=, *=, /=)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Update EJS tag patterns to use enhanced JavaScript
  - Modify `ejs-expression` pattern to use `ejs-javascript-enhanced` instead of `source.js`
  - Update `ejs-raw-output` pattern to use enhanced JavaScript patterns
  - Update `ejs-scriptlet` pattern to use enhanced JavaScript patterns
  - Ensure consistent pattern application across all EJS tag types
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6. Implement error detection and highlighting patterns
  - Create `unmatched-quotes` pattern to detect unclosed string literals
  - Implement `unmatched-brackets` pattern for unbalanced parentheses and brackets
  - Add `incomplete-template-literal` pattern for malformed template literal syntax
  - Create `malformed-interpolation` pattern for invalid `${}` syntax
  - Assign appropriate `invalid.illegal` and `invalid.incomplete` scopes
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Test grammar patterns with complex expressions
  - Create test EJS files with various template literal and interpolation combinations
  - Test the problematic line from form-modal.ejs with nested ternary operators
  - Verify highlighting works correctly for function calls with complex parameters
  - Test mixed quote types (single, double, template literals) in the same expression
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 8. Optimize regex patterns for performance
  - Review and optimize regex patterns to prevent catastrophic backtracking
  - Add appropriate quantifiers and anchors to improve matching efficiency
  - Test pattern performance with large EJS files containing many complex expressions
  - Implement pattern timeouts or limits for deeply nested expressions
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 9. Validate scope assignments and theme compatibility
  - Test grammar with different VS Code themes to ensure proper highlighting
  - Verify that new scope names follow TextMate grammar conventions
  - Test scope inheritance for nested patterns and complex expressions
  - Ensure fallback behavior works when patterns don't match
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 10. Create comprehensive test cases
  - Write test cases for all supported string interpolation patterns
  - Create test cases for complex ternary operators with multiple nesting levels
  - Test function calls with various parameter combinations and method chaining
  - Create test cases for error detection and invalid syntax highlighting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Integration testing with VS Code
  - Test the updated grammar in VS Code with real EJS files
  - Verify that syntax highlighting updates in real-time as users type
  - Test with the example form-modal.ejs file to ensure the problematic line is highlighted correctly
  - Validate that existing EJS functionality remains unaffected
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 12. Final validation and documentation
  - Run comprehensive tests with various EJS templates containing string interpolation
  - Verify all requirements are met through manual testing with complex expressions
  - Test performance with large files to ensure responsive highlighting
  - Update extension documentation to reflect improved syntax highlighting capabilities
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_