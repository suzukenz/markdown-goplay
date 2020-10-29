import * as os from "os";
import * as vscode from "vscode";
import * as fs from "fs";
import { execSync } from "child_process";
import path from "path";

class NotFoundCodeSectionError extends Error {}

const getStartPosition = (
  editor: vscode.TextEditor,
  initialLine: number
): vscode.Position => {
  for (let i = initialLine; i >= 0; i--) {
    const line = editor.document.lineAt(i);
    if (line.text.startsWith("```go")) {
      return editor.document.lineAt(i + 1).range.start;
    }
  }
  throw new NotFoundCodeSectionError();
};

const getEndPosition = (
  editor: vscode.TextEditor,
  initialLine: number
): vscode.Position => {
  for (let i = initialLine; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i);
    if (line.text.startsWith("```")) {
      return line.range.start;
    }
  }
  throw new NotFoundCodeSectionError();
};

export class MarkdownGoplay {
  #outputChannnel: vscode.OutputChannel;

  constructor() {
    this.#outputChannnel = vscode.window.createOutputChannel("markdown-goplay");
  }

  #getWorkdir = (editor: vscode.TextEditor): string => {
    const conf = vscode.workspace.getConfiguration("markdownGoplay");
    const workdir = conf.get<string>("workdir");
    if (workdir) {
      return workdir;
    }
    let fileDir = path.dirname(editor.document.uri.fsPath);
    return fileDir;
  };

  #detectSource = (editor: vscode.TextEditor): [string, number] => {
    // カーソルの行数
    const cursorLine = editor.selection.active.line;

    const start = getStartPosition(editor, cursorLine);
    const end = getEndPosition(editor, cursorLine);

    // 抽出した範囲のテキストを挿入すべきGoのソースコードとする
    const code = editor.document.getText(new vscode.Range(start, end));
    // ソースコードの次の行番号を結果の挿入位置として返却する
    return [code, end.line + 1];
  };

  #runGoCode = (code: string, cwd: string): string => {
    this.#outputChannnel.clear();

    const codePath = path.join(os.tmpdir(), "main.go");
    fs.writeFileSync(codePath, code);
    const cmd = "go run " + codePath;

    // パネルの出力タブに実行コマンドを書き出す
    this.#outputChannnel.appendLine(cmd);

    try {
      const buf = execSync(cmd, { cwd });

      const stdout = buf.toString();
      this.#outputChannnel.append(stdout);
      return stdout;
    } catch (e) {
      // 異常終了
      // エラー出力をパネルの出力タブに書き出して、表示する
      this.#outputChannnel.append(e.stderr.toString());
      this.#outputChannnel.show();
      throw e;
    }
  };

  public run = () => {
    if (!vscode.window.activeTextEditor) {
      // アクティブなテキストエディターがない場合実行しない。
      return;
    }

    try {
      const editor = vscode.window.activeTextEditor;
      const [code, endLine] = this.#detectSource(editor);
      const cwd = this.#getWorkdir(editor);
      const output = this.#runGoCode(code, cwd);
      console.log(output);
    } catch (e) {
      if (e instanceof NotFoundCodeSectionError) {
        vscode.window.showErrorMessage("Not found go code section.");
      }
    }
  };
}
