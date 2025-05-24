import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('generatecypresstest.generateCypressTest', (uri: vscode.Uri) => {
    const inputPath = uri.fsPath;

    if (!fs.existsSync(inputPath)) {
      vscode.window.showErrorMessage("❌ Datei nicht gefunden.");
      return;
    }

    const content = fs.readFileSync(inputPath, 'utf8');
    const folder = path.dirname(inputPath);
    const filename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(folder, `${filename}.feature`);

    fs.writeFileSync(outputPath, content);
    vscode.window.showInformationMessage(`✅ Feature-Datei erstellt: ${outputPath}`);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}