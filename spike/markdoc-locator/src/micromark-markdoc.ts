// A micromark extension for Markdoc's `{% … %}` syntax, so mdast carries exact offsets for tags.
// Block form: a tag alone on its line(s), as Markdoc's block rule requires. Inline form: anywhere in text.
// It only locates; Markdoc remains the reader.
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';

const LBRACE = 123, PCT = 37, RBRACE = 125, QUOTE = 34, BSL = 92, DOLLAR = 36;

type Code = number | null;
type Effects = any;
type State = (code: Code) => State | undefined;

// Consume `{% … %}` honouring Markdoc's string rule (findTagEnd): `%}` inside "…" does not close.
function tagBody(effects: Effects, ok: State, nok: State, opts: { block: boolean }): State {
  let inString = false;
  let escaped = false;
  let seenContent = false;
  let isVariable = false;

  return function start(code) {
    if (code !== LBRACE) return nok(code);
    effects.enter(opts.block ? 'markdocBlockTag' : 'markdocInlineTag');
    effects.enter('markdocTagData');
    effects.consume(code);
    return open2;
  };
  function open2(code: Code): State | undefined {
    if (code !== PCT) return nok(code);
    effects.consume(code);
    return inside;
  }
  function inside(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) {
      effects.exit('markdocTagData');
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      effects.enter('markdocTagData');
      return inside;
    }
    if (!seenContent && !markdownSpace(code)) {
      seenContent = true;
      if (code === DOLLAR) isVariable = true;
      // Markdoc's block rule refuses variables; they are inline.
      if (opts.block && isVariable) return nok(code);
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (code === BSL) escaped = true;
      else if (code === QUOTE) inString = false;
      effects.consume(code);
      return inside;
    }
    if (code === QUOTE) {
      inString = true;
      effects.consume(code);
      return inside;
    }
    if (code === PCT) {
      effects.consume(code);
      return maybeClose;
    }
    effects.consume(code);
    return inside;
  }
  function maybeClose(code: Code): State | undefined {
    if (code === RBRACE) {
      effects.consume(code);
      effects.exit('markdocTagData');
      if (!opts.block) {
        effects.exit('markdocInlineTag');
        return ok(code);
      }
      return trail;
    }
    return inside(code);
  }
  // Block form: only whitespace may follow on the line.
  function trail(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code);
      return trail;
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit('markdocBlockTag');
      return ok(code);
    }
    return nok(code);
  }
}

const blockConstruct = {
  name: 'markdocBlockTag',
  tokenize(this: unknown, effects: Effects, ok: State, nok: State) {
    return tagBody(effects, ok, nok, { block: true });
  },
};
const inlineConstruct = {
  name: 'markdocInlineTag',
  tokenize(this: unknown, effects: Effects, ok: State, nok: State) {
    return tagBody(effects, ok, nok, { block: false });
  },
};

/** The syntax extension. Markdoc has no setext headings, no indented code and (by default) no raw HTML. */
export const markdocSyntax = {
  flow: { [LBRACE]: blockConstruct },
  text: { [LBRACE]: inlineConstruct },
  disable: { null: ['codeIndented', 'setextUnderline', 'htmlFlow', 'htmlText'] },
};

/** The mdast extension: one `markdocTag` node per tag, with its raw source and exact position. */
export const markdocFromMarkdown = {
  enter: {
    markdocBlockTag(this: any, token: any) {
      this.enter({ type: 'markdocTag', block: true, raw: '' }, token);
    },
    markdocInlineTag(this: any, token: any) {
      this.enter({ type: 'markdocTag', block: false, raw: '' }, token);
    },
  },
  exit: {
    markdocBlockTag(this: any, token: any) {
      const node = this.stack[this.stack.length - 1];
      node.raw = this.sliceSerialize(token);
      this.exit(token);
    },
    markdocInlineTag(this: any, token: any) {
      const node = this.stack[this.stack.length - 1];
      node.raw = this.sliceSerialize(token);
      this.exit(token);
    },
  },
};
