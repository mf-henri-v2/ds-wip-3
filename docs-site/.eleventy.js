// Eleventy configuration for the DVS data schema GOV.UK-styled site.
//
// Design notes:
// - Input is the repository root (`..` from this config file's folder), so
//   Eleventy renders the existing Markdown in place. No content duplication.
// - The Eleventy scaffolding (layouts, includes, data, node_modules) lives
//   under `docs-site/` so the rest of the repository is unchanged.
// - Permalinks use the file's path so URLs mirror the repo layout exactly.
//   README.md files become directory-index pages.
// - Cross-file `.md` links in publication source are rewritten to pretty
//   URLs at output time via a transform, so they resolve on the rendered
//   site without changing the source files.
// - GOV.UK GovSpeak block markup ($CTA, $E, %...%, ^...^) is handled by the
//   `govspeak.js` markdown-it plugin.
// - The build reads a BASEURL env var (populated by actions/configure-pages
//   in CI) and rewrites govuk-frontend's `/assets/...` URLs so the site
//   works on both root-domain and subpath deploys.

const path = require("node:path");
const fs = require("node:fs");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const govspeak = require("./govspeak.js");

const BASEURL = process.env.BASEURL || "";

module.exports = function (eleventyConfig) {
  // Markdown with anchors and govspeak extensions.
  //
  // linkify is OFF: the source uses explicit [text](url) syntax everywhere
  // it wants a link. With linkify on, string literals like "GOV.UK" that
  // appear in prose (most notably in every caution block) get auto-linked
  // to http://GOV.UK, which is both wrong and ugly.
  const md = markdownIt({ html: true, linkify: false, typographer: false })
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink(),
    })
    .use(govspeak);
  eleventyConfig.setLibrary("md", md);

  // Pass through govuk-frontend assets, with BASEURL rewriting for CSS.
  const frontendAssets = path.resolve(
    __dirname,
    "node_modules/govuk-frontend/dist/govuk/assets"
  );
  const frontendJs = path.resolve(
    __dirname,
    "node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.js"
  );
  eleventyConfig.addPassthroughCopy({ [frontendAssets]: "assets" });
  eleventyConfig.addPassthroughCopy({
    [frontendJs]: "stylesheets/govuk-frontend.min.js",
  });

  // At build time, read the vendored govuk-frontend CSS, rewrite asset URLs
  // using BASEURL, and write the adjusted file into _site/stylesheets/.
  eleventyConfig.on("eleventy.after", async () => {
    const css = path.resolve(
      __dirname,
      "node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css"
    );
    if (!fs.existsSync(css)) return;
    let content = fs.readFileSync(css, "utf8");
    if (BASEURL) {
      content = content.replace(/url\(\/assets\//g, `url(${BASEURL}/assets/`);
    }
    const outDir = path.resolve(__dirname, "_site/stylesheets");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "govuk-frontend.min.css"), content);
  });

  // Rewrite .md links in rendered HTML to pretty URLs.
  eleventyConfig.addTransform("mdLinkRewrite", function (content) {
    if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) {
      return content;
    }
    return content.replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (m, p1, hash) => {
      const h = hash || "";
      if (p1.endsWith("/README")) {
        return `href="${p1.slice(0, -"/README".length)}/${h}"`;
      }
      if (p1 === "README" || p1 === "./README") {
        return `href="./${h}"`;
      }
      return `href="${p1}/${h}"`;
    });
  });

  return {
    dir: {
      input: "..",
      output: "_site",
      includes: "docs-site/_includes",
      data: "docs-site/_data",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid",
    pathPrefix: BASEURL ? BASEURL + "/" : "/",
  };
};
