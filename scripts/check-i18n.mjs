// Fails the build if hi.json / en.json don't have exactly the same keys as mr.json, or have empty strings.
import { readFileSync } from 'node:fs'

const load = (l) => JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'))
const base = load('mr')
const baseKeys = Object.keys(base)
let errors = 0

for (const lang of ['mr', 'hi', 'en']) {
  const dict = load(lang)
  for (const k of baseKeys) {
    if (!(k in dict)) (errors++, console.error(`[i18n] ${lang}.json is missing "${k}"`))
    else if (!String(dict[k]).trim()) (errors++, console.error(`[i18n] ${lang}.json has empty "${k}"`))
  }
  for (const k of Object.keys(dict)) {
    if (!(k in base)) (errors++, console.error(`[i18n] ${lang}.json has extra key "${k}" (not in mr.json)`))
  }
}

if (errors) process.exit(1)
console.log(`[i18n] ok — ${baseKeys.length} keys in mr/hi/en`)
