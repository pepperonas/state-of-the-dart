import ts from 'typescript';

/**
 * <Card> (variant elevated, the default) inside another elevated <Card>:
 * shadow on shadow. M3 separates nested surfaces by tone, not by stacking
 * elevation — an inner card should be `filled` or `outlined`.
 */
export function scanNestedElevation(source: string): number[] {
  const sf = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines: number[] = [];
  const isElevatedCard = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => {
    const tag = node.tagName.getText(sf);
    if (/^[a-z]/.test(tag) || tag.startsWith('motion.')) {
      // raw surface: className="… m3-elevated …" (static strings and template heads)
      const cls = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(sf) === 'className') as ts.JsxAttribute | undefined;
      const text = cls?.initializer?.getText(sf) ?? '';
      return /\bm3-elevated\b/.test(text);
    }
    if (tag !== 'Card') return false;
    const variant = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(sf) === 'variant') as ts.JsxAttribute | undefined;
    if (!variant) return true; // default is elevated
    const init = variant.initializer;
    if (init && ts.isStringLiteral(init)) return init.text === 'elevated';
    return false; // computed variant: not judged
  };
  const visit = (node: ts.Node, insideElevated: boolean) => {
    let inside = insideElevated;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      if (isElevatedCard(opening)) {
        if (insideElevated) lines.push(sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1);
        inside = true;
      }
    }
    ts.forEachChild(node, c => visit(c, inside));
  };
  visit(sf, false);
  return lines;
}
