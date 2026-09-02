// ── Diary color palette ───────────────────────────────────────────────────────
//
// Colors are stored as token keys (e.g. "primary") rather than Tailwind class
// names. At render time we convert to an inline backgroundColor using DaisyUI's
// CSS variables, which avoids Tailwind's JIT purging dynamic class names.
//
// DaisyUI v4 exposes per-component oklch channels:
//   --p  = primary, --s = secondary, --a = accent,
//   --in = info,    --su = success,  --wa = warning, --er = error

export interface DiaryColor {
  key:   string   // stored in DB / localStorage
  label: string   // shown in picker
  style: string   // CSS value for backgroundColor
}

export const DIARY_COLORS: DiaryColor[] = [
  { key: "primary",   label: "Primary",   style: "oklch(var(--p)  / 0.2)" },
  { key: "secondary", label: "Secondary", style: "oklch(var(--s)  / 0.2)" },
  { key: "accent",    label: "Accent",    style: "oklch(var(--a)  / 0.2)" },
  { key: "info",      label: "Info",      style: "oklch(var(--in) / 0.2)" },
  { key: "success",   label: "Success",   style: "oklch(var(--su) / 0.2)" },
  { key: "warning",   label: "Warning",   style: "oklch(var(--wa) / 0.2)" },
  { key: "error",     label: "Error",     style: "oklch(var(--er) / 0.2)" },
]

const BY_KEY = Object.fromEntries(DIARY_COLORS.map(c => [c.key, c]))

/** Resolve a stored key to its inline backgroundColor value.
 *  Falls back to primary if the key is unknown or empty. */
export function resolveColorStyle(key: string): string {
  // Legacy: if a full class name was stored (e.g. "bg-primary/20"), extract the token
  const normalised = key.replace(/^bg-/, "").replace(/\/\d+$/, "")
  return (BY_KEY[normalised] ?? BY_KEY["primary"]).style
}

/** Return the default color key for a given index (for new diaries). */
export function defaultColorKey(index: number): string {
  return DIARY_COLORS[index % DIARY_COLORS.length].key
}
