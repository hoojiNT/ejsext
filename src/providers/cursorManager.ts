/**
 * Cursor Manager for EJS templates
 * Handles cursor styling when hovering over defined variables
 */

import * as vscode from 'vscode';
import { EJSVisualFeedbackProvider } from './visualFeedbackProvider';

/**
 * Manages cursor styling for EJS variable interactions
 */
export class EJSCursorManager {
  private currentEditor: vscode.TextEditor | undefined;
  private hoverTimeout: NodeJS.Timeout | undefined;
  private isDisposed = false;

  constructor(private visualFeedbackProvider: EJSVisualFeedbackProvider) {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for cursor management
   */
  private setupEventListeners(): void {
    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      this.currentEditor = editor;
    });

    // Listen for cursor position changes
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (this.isDisposed) return;
      
      const editor = event.textEditor;
      if (editor.document.languageId !== 'ejs') {
        return;
      }

      this.handleCursorPositionChange(editor, event.selections[0].active);
    });

    // Set initial editor
    this.currentEditor = vscode.window.activeTextEditor;
  }

  /**
   * Handle cursor position changes
   * @param editor The text editor
   * @param position The cursor position
   */
  private handleCursorPositionChange(editor: vscode.TextEditor, position: vscode.Position): void {
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Set a small delay to avoid excessive processing
    this.hoverTimeout = setTimeout(() => {
      this.updateCursorStyle(editor, position);
    }, 100);
  }

  /**
   * Update cursor style based on whether we're over a defined variable
   * @param editor The text editor
   * @param position The cursor position
   */
  private updateCursorStyle(editor: vscode.TextEditor, position: vscode.Position): void {
    if (this.isDisposed) return;

    try {
      const isOverDefinedVariable = this.visualFeedbackProvider.isOverDefinedVariable(
        editor.document, 
        position
      );

      if (isOverDefinedVariable) {
        // Set cursor to pointer to indicate clickable
        vscode.commands.executeCommand('setContext', 'ejs.overDefinedVariable', true);
      } else {
        // Reset cursor to default
        vscode.commands.executeCommand('setContext', 'ejs.overDefinedVariable', false);
      }
    } catch (error) {
      console.error('Error updating cursor style:', error);
    }
  }

  /**
   * Dispose of the cursor manager
   */
  dispose(): void {
    this.isDisposed = true;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    vscode.commands.executeCommand('setContext', 'ejs.overDefinedVariable', false);
  }
}