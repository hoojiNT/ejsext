# EJS Syntax Highlighting

Extension VS Code để hỗ trợ syntax highlighting cho EJS templates.

## Tính năng

- Syntax highlighting cho EJS tags: `<%`, `<%=`, `<%-`, `<%#`
- Auto-closing pairs cho EJS brackets
- Comment support cho EJS comments
- Tích hợp với HTML syntax highlighting

## Cài đặt

1. Mở VS Code
2. Nhấn `Ctrl+Shift+P` để mở Command Palette
3. Gõ "Extensions: Install from VSIX"
4. Chọn file .vsix của extension

## Sử dụng

Extension sẽ tự động kích hoạt khi bạn mở file có đuôi `.ejs`.

## Các EJS tags được hỗ trợ

- `<% %>` - Scriptlet tags (JavaScript code)
- `<%= %>` - Expression tags (output escaped)
- `<%- %>` - Raw output tags (output unescaped)
- `<%# %>` - Comment tags