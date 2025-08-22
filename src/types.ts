/**
 * Core type definitions for EJS Go to Definition functionality
 */

import * as vscode from 'vscode';

/**
 * Represents different types of EJS tags
 */
export type EJSTagType = 'scriptlet' | 'output' | 'unescaped';

/**
 * Represents different kinds of symbols that can be defined
 */
export enum SymbolKind {
  Variable = 'variable',
  Constant = 'constant',
  Parameter = 'parameter',
  Property = 'property'
}

/**
 * Represents different types of variable declarations
 */
export type DeclarationType = 'const' | 'let' | 'var' | 'parameter' | 'destructured';

/**
 * Represents different scopes where variables can be defined
 */
export type SymbolScope = 'global' | 'block' | 'function';

/**
 * Represents a location within a document
 */
export interface Location {
  line: number;
  character: number;
  length: number;
}

/**
 * Represents a JavaScript code block extracted from EJS template
 */
export interface JavaScriptBlock {
  content: string;
  startLine: number;
  endLine: number;
  startCharacter: number;
  endCharacter: number;
  tagType: EJSTagType;
}

/**
 * Represents information about a symbol (variable, constant, etc.)
 */
export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  location: Location;
  definition: Location;
  references: Location[];
  value?: string;
}

/**
 * Represents a symbol definition with additional metadata
 */
export interface SymbolDefinition {
  name: string;
  kind: SymbolKind;
  location: Location;
  declarationType: DeclarationType;
  value?: string;
  scope: SymbolScope;
}

/**
 * Represents a parsed EJS document with extracted JavaScript blocks and symbols
 */
export interface ParsedEJSDocument {
  jsBlocks: JavaScriptBlock[];
  symbols: SymbolInfo[];
}

/**
 * Represents cached document information for performance optimization
 */
export interface DocumentCache {
  uri: string;
  version: number;
  symbols: Map<string, SymbolInfo[]>;
  lastParsed: number;
}