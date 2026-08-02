// JSON-LD reaches the page through dangerouslySetInnerHTML, so a `<` that survives
// serialization can close the script element early and everything after it is
// parsed as markup instead of data.
//
// Nothing here is a live hole: every value in our structured data is authored in
// this repo, so there is no untrusted input to exploit. The realistic failure is
// clumsier than an attack — the product schema carries customer review text that
// is transcribed by hand, and one paste containing a literal `</script>` would
// break the page for that product with no obvious cause.
//
// Escaping `<` to its unicode form is transparent to a JSON parser and inert to an
// HTML one, and it round-trips to the identical string, so it costs nothing to
// apply to every payload rather than reasoning each time about which are safe.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
