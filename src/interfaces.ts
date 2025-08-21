/**
 * Interface definitions for EJS parsing and symbol analysis components
 */

import * as vscode from 'vscode';
import { JavaScriptBlock, ParsedEJSDocument, SymbolInfo, SymbolDefinition } from './types';

/**
 * Interface for parsing EJS templates and extracting JavaScript blocks
 */
export interface IEJSParser {
  /**
   * Parse an EJS document and extract JavaScript blocks and symbols
   * @param document The VS Code text document to parse
   * @returns Parsed document with JavaScript blocks and symbols
   */
  parseDocument(document: vscode.TextDocument): ParsedEJSDocument;

  /**
   * Extract JavaScript code blocks from EJS template content
   * @param content The EJS template content as string
   * @returns Array of JavaScript blocks found in the template
   */
  extractJavaScriptBlocks(content: string): JavaScriptBlock[];
}

/**
 * Interface for analyzing symbols within JavaScript blocks
 */
export interface ISymbolAnalyzer {
  /**
   * Analyze JavaScript blocks to identify variable definitions and references
   * @param jsBlocks Array of JavaScript blocks to analyze
   * @returns Array of symbol information found in the blocks
   */
  analyzeSymbols(jsBlocks: JavaScriptBlock[]): SymbolInfo[];

  /**
   * Find the definition of a symbol at a specific position
   * @param symbolName Name of the symbol to find
   * @param position Position where the symbol is referenced
   * @returns Symbol information if found, null otherwise
   */
  findDefinition(symbolName: string, position: vscode.Position): SymbolInfo | null;
}

/**
 * Interface for caching parsed document symbols for performance
 */
export interface IDocumentCache {
  /**
   * Get cached symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @returns Cached symbols if available and up-to-date, null otherwise
   */
  getSymbols(uri: string, version: number): Map<string, SymbolDefinition[]> | null;

  /**
   * Cache symbols for a document
   * @param uri Document URI
   * @param version Document version
   * @param symbols Symbols to cache
   */
  setSymbols(uri: string, version: number, symbols: Map<string, SymbolDefinition[]>): void;

  /**
   * Clear cache for a specific document
   * @param uri Document URI
   */
  clearDocument(uri: string): void;

  /**
   * Clear all cached data
   */
  clearAll(): void;
}