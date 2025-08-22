/**
 * Main entry point for EJS Go to Definition functionality
 * Exports all public interfaces and classes
 */

// Type definitions
export * from './types';

// Interfaces
export * from './interfaces';

// Core components
export { EJSParser } from './parser/ejsParser';
export { SymbolAnalyzer } from './analyzer/symbolAnalyzer';
export { DocumentCacheManager } from './cache/documentCache';

// VS Code providers
export { EJSDefinitionProvider } from './providers/definitionProvider';
export { EJSHoverProvider } from './providers/hoverProvider';
export { EJSVisualFeedbackProvider } from './providers/visualFeedbackProvider';
export { EJSCursorManager } from './providers/cursorManager';