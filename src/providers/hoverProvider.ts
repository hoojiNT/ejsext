/**
 * VS Code Hover Provider for EJS templates
 */

import * as vscode from 'vscode';
import { IEJSParser, ISymbolAnalyzer } from '../interfaces';

/**
 * Provides hover information for variables in EJS templates
 */
export class EJSHoverProvider implements vscode.HoverProvider {
  constructor(
    private parser: IEJSParser,
    private symbolAnalyzer: ISymbolAnalyzer
  ) {}

  /**
   * Provide hover information for a symbol at the given position
   * @param document The document in which the command was invoked
   * @param position The position at which the command was invoked
   * @param token A cancellation token
   * @returns Hover information or null if not available
   */
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Implementation will be added in subsequent tasks
    return null;
  }
}