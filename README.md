# EJS Syntax Highlighting

VS Code extension for EJS template syntax highlighting support.

## Features

- Syntax highlighting for EJS tags: `<%`, `<%=`, `<%-`, `<%#`
- Auto-closing pairs for EJS brackets
- Comment support for EJS comments
- Integration with HTML syntax highlighting

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type "Extensions: Install from VSIX"
4. Select the extension's .vsix file

## Usage

The extension will automatically activate when you open files with `.ejs` extension.

## Supported EJS tags

- `<% %>` - Scriptlet tags (JavaScript code)
- `<%= %>` - Expression tags (output escaped)
- `<%- %>` - Raw output tags (output unescaped)
- `<%# %>` - Comment tags
