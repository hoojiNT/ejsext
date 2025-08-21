/**
 * VS Code extension entry point for EJS Go to Definition
 */

import * as vscode from 'vscode';
import { 
  EJSParser, 
  SymbolAnalyzer, 
  DocumentCacheManager,
  EJSDefinitionProvider,
  EJSHoverProvider 
} from './index';

/**
 * Extension activation function
 * @param context VS Code extension context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('EJS Syntax Highlighting extension with Go to Definition is now active!');

  // Initialize core components
  const parser = new EJSParser();
  const symbolAnalyzer = new SymbolAnalyzer();
  const documentCache = new DocumentCacheManager();

  // Initialize providers
  const definitionProvider = new EJSDefinitionProvider(parser, symbolAnalyzer);
  const hoverProvider = new EJSHoverProvider(parser, symbolAnalyzer);

  // Register providers for EJS files
  const ejsSelector: vscode.DocumentSelector = { language: 'ejs', scheme: 'file' };

  // Register Definition Provider
  const definitionDisposable = vscode.languages.registerDefinitionProvider(
    ejsSelector,
    definitionProvider
  );

  // Register Hover Provider
  const hoverDisposable = vscode.languages.registerHoverProvider(
    ejsSelector,
    hoverProvider
  );

  // Add disposables to context
  context.subscriptions.push(definitionDisposable, hoverDisposable);

  // Optional: Add document change listener for cache invalidation
  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'ejs') {
      documentCache.clearDocument(event.document.uri.toString());
    }
  });

  context.subscriptions.push(documentChangeDisposable);
}

/**
 * Extension deactivation function
 */
export function deactivate() {
  console.log('EJS Go to Definition extension deactivated');
}