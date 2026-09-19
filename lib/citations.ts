export type AnswerToken =
  | { kind: "text"; value: string }
  | { kind: "cite"; n: number };

/**
 * Split a model answer into text and citation tokens.
 * The model is instructed to cite sources as [1], [2], … matching the
 * numbered context chunks it received.
 */
export function parseCitations(answer: string): AnswerToken[] {
  const tokens: AnswerToken[] = [];
  const re = /\[(\d{1,2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", value: answer.slice(last, m.index) });
    tokens.push({ kind: "cite", n: parseInt(m[1], 10) });
    last = m.index + m[0].length;
  }
  if (last < answer.length) tokens.push({ kind: "text", value: answer.slice(last) });
  return tokens;
}
