import * as vscode from "vscode";

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

  public run = () => {
    if (!vscode.window.activeTextEditor) {
      // アクティブなテキストエディターがない場合実行しない。
      return;
    }

    try {
      const editor = vscode.window.activeTextEditor;
      const [code, endLine] = this.#detectSource(editor);
      console.log(code, endLine);
    } catch (e) {
      if (e instanceof NotFoundCodeSectionError) {
        vscode.window.showErrorMessage("Not found go code section.");
      }
    }
  };
}
