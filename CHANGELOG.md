# Changelog

All notable changes to the "Better EJS" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Go to Definition** support for variables in EJS templates
  - Navigate to variable definitions using Ctrl+Click or F12
  - Support for `const`, `let`, `var` declarations
  - Function parameter recognition
  - Destructured variable assignment support
- **Hover Provider** for variable information
  - Shows variable definition details on hover
  - Displays variable type and definition location
  - Shows variable values when determinable
- **Visual Feedback** enhancements
  - Cursor changes to indicate clickable variables
  - Variable highlighting on hover for defined variables
  - Brief highlighting of target line after navigation
- **Advanced EJS Parsing**
  - Support for all EJS tag types: `<% %>`, `<%- %>`, `<%= %>`, `<%# %>`
  - Accurate line and character position calculation
  - JavaScript block extraction from EJS templates
- **Symbol Analysis**
  - Variable definition detection across EJS templates
  - Support for complex expressions and template literals
  - Scope-aware variable recognition
- **Testing Infrastructure**
  - Comprehensive unit tests for all core functionality
  - Integration tests with real EJS files
  - Performance testing for large files
  - Vitest testing framework integration

### Changed
- Enhanced project structure with TypeScript
- Improved extension architecture with modular providers
- Updated development dependencies

### Performance
- Optimized symbol lookup for large files
- Implemented efficient EJS parsing algorithms
- Added performance monitoring for sub-500ms response times

## [0.0.1] - 2024-XX-XX

### Added
- Initial release with basic EJS syntax highlighting
- Support for EJS template tags: `<%`, `<%=`, `<%-`, `<%#`
- Auto-closing pairs for EJS brackets
- Comment support for EJS comments
- Integration with HTML syntax highlighting
- Language configuration for EJS files
- TextMate grammar for syntax highlighting

### Features
- Automatic activation for `.ejs` files
- Syntax highlighting for JavaScript code within EJS tags
- Proper bracket matching and auto-completion
- Comment toggling support