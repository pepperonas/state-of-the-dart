import ts from 'typescript';

/** A piece of user-visible text written straight into JSX instead of `t(...)`. */
export interface Literal {
  line: number;
  text: string;
  where: 'text' | string; // 'text' for JSX children, otherwise the attribute name
}

/** Attributes whose value a person reads or hears. */
export const VISIBLE_ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'aria-description', 'aria-roledescription']);

/**
 * Strings that are not language: brand names, units, darts notation, symbols.
 * Kept short on purpose — every entry is a place a translation will never reach.
 */
export const NOT_LANGUAGE = [
  /^[^A-Za-zÄÖÜäöüß]*$/, // digits, punctuation, symbols
  /^(State of the Dart|Google|GitHub|Stripe|PayPal|PWA|JSON|CSV|XLSX|PDF|Excel|Bull|Bullseye|Cricket|Shanghai|X01|ATC|ELO|BPM|UUID|ID|OK|vs\.?|x|×|S|D|T|DB|SB|MPR|PPD|Ø|Avg|n\/a|—)$/i,
  /^[SDT]\d{1,2}$/, // darts beds
  /^[a-z]+$/, // lowercase identifiers used as text are icon names or keys
  /^\d+(\.\d+)?\s?(%|px|ms|s|kB|MB)$/,
];

export const hasLetters = (s: string) => /[A-Za-zÄÖÜäöüß]{2,}/.test(s);
export const isLanguage = (s: string) => hasLetters(s) && !NOT_LANGUAGE.some(r => r.test(s.trim()));

/** True if a string literal ends up as a JSX child (possibly through ?:, &&, ||, ??, parentheses). */
function rendersAsText(node: ts.Node): boolean {
  let n: ts.Node = node;
  for (;;) {
    const p = n.parent;
    if (!p) return false;
    if (ts.isParenthesizedExpression(p)) { n = p; continue; }
    if (ts.isConditionalExpression(p) && (p.whenTrue === n || p.whenFalse === n)) { n = p; continue; }
    if (ts.isBinaryExpression(p) && p.right === n && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(p.operatorToken.kind)) { n = p; continue; }
    if (ts.isJsxExpression(p)) return ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent) || (ts.isJsxAttribute(p.parent) && VISIBLE_ATTRS.has(p.parent.name.getText()));
    return false;
  }
}

/**
 * `language === 'de' ? 'Hallo' : 'Hello'` — translation by hand, beside i18next.
 * Only forks between two text literals count: choosing a locale code
 * (`'de-DE' : 'en-US'`) or a data field (`preset.nameDE : preset.name`) is not
 * a translation written into the code.
 */
export function scanLanguageForks(source: string): number[] {
  const lines: number[] = [];
  const lit = `(['"\`])([^'"\`]*)\\1`;
  const re = new RegExp(`(?:language|lang|lng)\\s*===?\\s*['"](?:de|en)['"]\\s*\\?\\s*${lit}\\s*:\\s*${lit.replace('\\1', '\\3')}`);
  const isLocale = (v: string) => /^[a-z]{2}(-[A-Z]{2})?$/.test(v);
  source.split('\n').forEach((l, i) => {
    const m = l.match(re);
    if (m && !(isLocale(m[2]) && isLocale(m[4]))) lines.push(i + 1);
  });
  return lines;
}

export function scanLiterals(source: string, fileName = 'x.tsx'): Literal[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Literal[] = [];
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/\s+/g, ' ').trim();
      if (text && isLanguage(text)) out.push({ line: line(node), text, where: 'text' });
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf);
      if (VISIBLE_ATTRS.has(name)) {
        let value: string | undefined;
        const init = node.initializer;
        if (ts.isStringLiteral(init)) value = init.text;
                if (value !== undefined && isLanguage(value)) out.push({ line: line(node), text: value, where: name });
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && rendersAsText(node)) {
      // {'text'}, {cond ? 'a' : 'b'}, {x && 'text'}, {x ?? 'text'} as a child
      if (isLanguage(node.text)) out.push({ line: line(node), text: node.text, where: 'text' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
