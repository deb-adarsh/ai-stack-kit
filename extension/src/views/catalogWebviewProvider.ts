import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SKILL_BROWSER_URL } from '../constants.js';
import { requireWorkspace } from '../services/workspaceService.js';
import { applyGithubTokenFromSettings } from '../services/configService.js';
import { prepareWebviewHtml } from '../utils/webview.js';

export class CatalogWebviewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    const mediaRoot = vscode.Uri.joinPath(this.extensionUri, 'media');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaRoot],
    };

    const catalogDir = path.join(this.extensionUri.fsPath, 'media', 'catalog');
    const catalogHtml = path.join(catalogDir, 'index.html');
    const fallbackDir = path.join(this.extensionUri.fsPath, 'media', 'catalog-fallback');

    if (fs.existsSync(catalogHtml)) {
      webviewView.webview.html = this.loadBuiltWebview(webviewView.webview, catalogDir);
    } else {
      webviewView.webview.html = this.loadFallbackWebview(webviewView.webview, fallbackDir);
    }

    webviewView.webview.onDidReceiveMessage(async (msg: { type: string; id?: string; text?: string }) => {
      if (msg.type === 'openSkillBrowser') {
        await vscode.env.openExternal(vscode.Uri.parse(SKILL_BROWSER_URL));
        return;
      }
      if (msg.type === 'copy' && msg.text) {
        await vscode.env.clipboard.writeText(msg.text);
        void webviewView.webview.postMessage({ type: 'toast', text: 'Copied!' });
        return;
      }
      if (msg.type === 'add' && msg.id) {
        try {
          applyGithubTokenFromSettings();
          const ws = requireWorkspace();
          await ws.addModule({ name: msg.id });
          void vscode.window.showInformationMessage(`Added "${msg.id}" to spec.yaml`);
          void vscode.commands.executeCommand('aistack.modules.refresh');
        } catch (e) {
          void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
        }
      }
    });
  }

  private loadBuiltWebview(webview: vscode.Webview, catalogDir: string): string {
    const indexPath = path.join(catalogDir, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    const catalogJsonUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'catalog', 'catalog.json')
    );
    html = html.replace(
      '<body>',
      `<body data-aistack-catalog="${catalogJsonUri.toString().replace(/"/g, '&quot;')}">`
    );
    return prepareWebviewHtml(webview, html, vscode.Uri.file(catalogDir), {
      connectSrc: [catalogJsonUri],
    });
  }

  private loadFallbackWebview(webview: vscode.Webview, fallbackDir: string): string {
    const indexPath = path.join(fallbackDir, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    const catalogJsonUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'catalog.json')
    );
    html = html.replace(
      '<body>',
      `<body data-aistack-catalog="${catalogJsonUri.toString().replace(/"/g, '&quot;')}">`
    );
    return prepareWebviewHtml(webview, html, vscode.Uri.file(fallbackDir), {
      connectSrc: [catalogJsonUri],
    });
  }
}
