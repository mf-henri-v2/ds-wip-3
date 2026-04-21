// govspeak.js
//
// markdown-it plugin implementing a subset of GOV.UK publishing GovSpeak
// extensions, matched to the GOV.UK Design System (govuk-frontend v5) CSS
// classes.
//
// Handles:
//   $CTA ... $CTA   call-to-action box
//   $E   ... $E     example / code-like fenced block
//   %    ... %      inline warning notice (on its own line)
//   ^    ... ^      inline help notice (on its own line)

function govspeak(md) {
  function createFencedBlock(name, startRe, endRe, openHtml, closeHtml) {
    const openName = `${name}_open`;
    const closeName = `${name}_close`;

    md.block.ruler.before("paragraph", openName, function (state, startLine, endLine, silent) {
      const pos = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      const line = state.src.slice(pos, max);
      if (!startRe.test(line)) return false;
      if (silent) return true;

      let nextLine = startLine + 1;
      let found = false;
      while (nextLine < endLine) {
        const nPos = state.bMarks[nextLine] + state.tShift[nextLine];
        const nMax = state.eMarks[nextLine];
        const nLine = state.src.slice(nPos, nMax);
        if (endRe.test(nLine)) {
          found = true;
          break;
        }
        nextLine++;
      }
      if (!found) return false;

      const openTok = state.push(openName, "div", 1);
      openTok.markup = line;

      const innerStart = state.bMarks[startLine + 1];
      const innerEnd = state.eMarks[nextLine - 1];
      const innerSrc = state.src.slice(innerStart, innerEnd);
      state.md.block.parse(innerSrc, state.md, state.env, state.tokens);

      const closeTok = state.push(closeName, "div", -1);
      closeTok.markup = state.src.slice(state.bMarks[nextLine], state.eMarks[nextLine]);

      state.line = nextLine + 1;
      return true;
    });

    md.renderer.rules[openName] = () => openHtml;
    md.renderer.rules[closeName] = () => closeHtml;
  }

  createFencedBlock(
    "gov_cta",
    /^\$CTA\s*$/,
    /^\$CTA\s*$/,
    '<div class="call-to-action govuk-inset-text">',
    "</div>"
  );

  createFencedBlock(
    "gov_example",
    /^\$E\s*$/,
    /^\$E\s*$/,
    '<pre class="govuk-!-padding-3 govuk-!-margin-bottom-3" style="background:#f3f2f1;overflow-x:auto"><code>',
    "</code></pre>"
  );

  createFencedBlock(
    "gov_warning",
    /^%\s*$/,
    /^%\s*$/,
    '<div class="govuk-warning-text"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text"><span class="govuk-warning-text__assistive">Warning</span>',
    "</strong></div>"
  );

  createFencedBlock(
    "gov_help",
    /^\^\s*$/,
    /^\^\s*$/,
    '<div class="govuk-inset-text">',
    "</div>"
  );

  // Add GOV.UK classes to common elements rendered from Markdown.
  function classify(tokens, tag, cls) {
    for (const tok of tokens) {
      if (tok.type === `${tag}_open`) {
        const existing = tok.attrGet("class");
        tok.attrSet("class", existing ? `${existing} ${cls}` : cls);
      }
    }
  }

  md.core.ruler.push("govspeak_classify", (state) => {
    classify(state.tokens, "heading", "");
    for (const tok of state.tokens) {
      if (tok.type === "heading_open") {
        const tag = tok.tag; // h1..h6
        const existing = tok.attrGet("class") || "";
        const map = {
          h1: "govuk-heading-xl",
          h2: "govuk-heading-l",
          h3: "govuk-heading-m",
          h4: "govuk-heading-s",
        };
        const cls = map[tag];
        if (cls && !existing.includes(cls)) {
          tok.attrSet("class", (existing + " " + cls).trim());
        }
      }
      if (tok.type === "paragraph_open") {
        const existing = tok.attrGet("class") || "";
        if (!existing.includes("govuk-body")) {
          tok.attrSet("class", (existing + " govuk-body").trim());
        }
      }
      if (tok.type === "bullet_list_open") {
        const existing = tok.attrGet("class") || "";
        if (!existing.includes("govuk-list")) {
          tok.attrSet(
            "class",
            (existing + " govuk-list govuk-list--bullet").trim()
          );
        }
      }
      if (tok.type === "ordered_list_open") {
        const existing = tok.attrGet("class") || "";
        if (!existing.includes("govuk-list")) {
          tok.attrSet(
            "class",
            (existing + " govuk-list govuk-list--number").trim()
          );
        }
      }
      if (tok.type === "table_open") {
        const existing = tok.attrGet("class") || "";
        if (!existing.includes("govuk-table")) {
          tok.attrSet("class", (existing + " govuk-table").trim());
        }
      }
    }
  });
}

module.exports = govspeak;
