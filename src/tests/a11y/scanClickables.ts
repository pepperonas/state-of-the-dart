import ts from 'typescript';

const INTERACTIVE = new Set(['button', 'a', 'input', 'select', 'textarea', 'label', 'summary', 'option']);

/**
 * Elements that react to a click but are not controls: a `<div onClick>` is
 * invisible to the keyboard and to screen readers. Allowed when it declares a
 * role, is itself focusable with a key handler, only stops propagation, or is
 * an overlay backdrop marked `data-backdrop`.
 */
export function scanClickables(source: string, fileName = 'x.tsx'): { line: number; tag: string }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: { line: number; tag: string }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const intrinsic = /^[a-z]/.test(tag) || tag.startsWith('motion.');
      const base = tag.replace(/^motion\./, '');
      if (intrinsic && !INTERACTIVE.has(base)) {
        const attrs = new Map<string, ts.JsxAttribute>();
        for (const a of node.attributes.properties) if (ts.isJsxAttribute(a)) attrs.set(a.name.getText(sf), a);
        const click = attrs.get('onClick');
        if (click) {
          const body = click.initializer?.getText(sf) ?? '';
          const onlyStops = /^\{\s*\(?\s*\w*\s*\)?\s*=>\s*\{?\s*\w+\.stopPropagation\(\)\s*;?\s*\}?\s*\}$/.test(body);
          const hasRole = attrs.has('role');
          // A backdrop that closes an overlay: Escape is the keyboard path, the click is a mouse convenience.
          if (attrs.has('data-backdrop')) { ts.forEachChild(node, visit); return; }
          const keyboard = attrs.has('onKeyDown') || attrs.has('onKeyUp');
          if (!onlyStops && !hasRole && !keyboard) out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, tag });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
