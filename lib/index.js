// silk-background — dsh client plugin, NODE half.
//
// Intentionally a no-op: the browser half (client.js) is discovered by
// @deepseek-ai/dsh-client-modules through the package.json `dsh.client`
// declaration, served at /plugins/silk-background/client.js and loaded by the
// web shell at boot. This half exists so the loader entry has a live fiber.
//
// Install (recommended, needs pnpm + git on PATH):
//   dsh plugin --profile web add github:<owner>/silk-background
// then restart `dsh web`. See README.md for the manual fallback install,
// usage, uninstall, and migration from an older hand-copied install.

/** Stable Cordis plugin name. */
const name = "silk-background";

function apply() {
  // No host-side work: the client half runs entirely in the browser.
}

export { apply, name };
