/**
 * Mock implementation of VS Code API for testing
 */

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(
    public start: Position,
    public end: Position
  ) {}
}

export class Location {
  constructor(
    public uri: any,
    public range: Range
  ) {}
}

export class DocumentHighlight {
  constructor(
    public range: Range,
    public kind: DocumentHighlightKind
  ) {}
}

export enum DocumentHighlightKind {
  Text = 0,
  Read = 1,
  Write = 2
}

export class MarkdownString {
  public isTrusted = false;
  private content = '';

  appendCodeblock(code: string, language?: string): void {
    this.content += `\`\`\`${language || ''}\n${code}\n\`\`\`\n`;
  }

  appendMarkdown(markdown: string): void {
    this.content += markdown;
  }

  toString(): string {
    return this.content;
  }
}

export class Hover {
  constructor(
    public contents: MarkdownString | string,
    public range?: Range
  ) {}
}

export interface TextDocument {
  uri: any;
  languageId: string;
  version: number;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position): Range | undefined;
}

export interface TextEditor {
  document: TextDocument;
  setDecorations(decorationType: any, ranges: any[]): void;
}

export const window = {
  createTextEditorDecorationType: (options: any) => ({
    key: 'mock-decoration-type',
    options,
    dispose: () => {}
  }),
  activeTextEditor: undefined as TextEditor | undefined,
  onDidChangeActiveTextEditor: (callback: (editor: TextEditor | undefined) => void) => ({
    dispose: () => {}
  }),
  onDidChangeTextEditorSelection: (callback: (event: any) => void) => ({
    dispose: () => {}
  })
};

export const commands = {
  executeCommand: (command: string, ...args: any[]) => Promise.resolve()
};

export const languages = {
  registerDefinitionProvider: (selector: any, provider: any) => ({
    dispose: () => {}
  }),
  registerHoverProvider: (selector: any, provider: any) => ({
    dispose: () => {}
  }),
  registerDocumentHighlightProvider: (selector: any, provider: any) => ({
    dispose: () => {}
  })
};

export const workspace = {
  onDidChangeTextDocument: (callback: (event: any) => void) => ({
    dispose: () => {}
  })
};

export interface CancellationToken {
  isCancellationRequested: boolean;
}

export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;
export type Definition = Location | Location[];

export interface DefinitionProvider {
  provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<Definition>;
}

export interface HoverProvider {
  provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<Hover>;
}

export interface DocumentHighlightProvider {
  provideDocumentHighlights(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<DocumentHighlight[]>;
}