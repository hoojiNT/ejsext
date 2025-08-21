/**
 * VS Code Definition Provider for EJS templates
 */

import * as vscode from 'vscode';
import { IEJSParser, ISymbolAnalyzer } from '../interfaces';

/**
 * Provides "Go to Definition" functionality for EJS templates
 */
export class EJSDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private parser: IEJSParser,
    private symbolAnalyzer: ISymbolAnalyzer
  ) {}

  /**
   * Provide definition location for a symbol at the given position
   * @param document The document in which the command was invoked
   * @param position The position at which the command was invoked
   * @param token A cancellation token
   * @returns Definition location or null if not found
   */
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition> {
    // Implementation will be added in subsequent tasks
    return null;
  }
}