// Converts a source's HTML (or, as with Greenhouse, HTML that has itself
// been HTML-entity-encoded — literal "&lt;p&gt;" in the JSON) into plain
// text safe for eligibility classification, preserving paragraph/list/
// heading breaks as newlines so "required qualifications" sections stay
// separable from surrounding prose instead of collapsing into one blob.

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', copy: '©',
  reg: '®', trade: '™',
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
}

const BLOCK_TAGS = /<\/(p|div|li|h[1-6]|br|tr|ul|ol)\s*>|<(br|\/br)\s*\/?>/gi

export function htmlToText(rawHtml) {
  if (!rawHtml) return ''
  // Entities can be nested one level (a literally-encoded "&lt;p&gt;"
  // decodes to "<p>", which is real markup that still needs stripping) —
  // decode twice, which is enough for every source seen so far without
  // looping unboundedly on adversarial input.
  let text = decodeEntities(decodeEntities(rawHtml))
  text = text.replace(BLOCK_TAGS, '\n')
  text = text.replace(/<[^>]*>/g, ' ')
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
  return text.slice(0, 20000)
}
