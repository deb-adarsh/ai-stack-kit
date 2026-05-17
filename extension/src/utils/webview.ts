import * as vscode from 'vscode';

/** Cryptographic nonce for webview Content-Security-Policy (see VS Code webview guidelines). */
export function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < 32; i++) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

export interface WebviewCspOptions {
  /** Extra URIs allowed for fetch/XHR (e.g. bundled catalog.json). */
  connectSrc?: vscode.Uri[];
}

/** Inject CSP meta tag and script nonces; rewrite root-relative asset paths. */
export function prepareWebviewHtml(
  webview: vscode.Webview,
  html: string,
  baseDir: vscode.Uri,
  options?: WebviewCspOptions
): string {
  const base = webview.asWebviewUri(baseDir).toString();
  html = html.replace(/(href|src)="\/assets\//g, `$1="${base}/assets/`);
  html = html.replace(/(href|src)="\.\//g, `$1="${base}/`);

  const nonce = getNonce();
  const connectExtra = options?.connectSrc?.map((u) => u.toString()).join(' ') ?? '';
  const connectSrc = connectExtra ? `${webview.cspSource} ${connectExtra}` : webview.cspSource;
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    `font-src ${webview.cspSource}`,
    `connect-src ${connectSrc}`,
  ].join('; ');

  html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/gi, '');
  html = html.replace(/<head>/i, `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`);
  html = html.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`);
  return html;
}
