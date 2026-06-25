/**
 * Substitute `{{variable}}` placeholders in VML before compile.
 * Values: explicit map → `VELOX_*` env vars → left unchanged.
 */
export function applyVmlVariables(
  markup: string,
  vars: Record<string, string> = {},
): string {
  return markup.replace(/\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g, (full, key: string) => {
    if (vars[key] !== undefined) return vars[key]
    const envKey = `VELOX_${key.replace(/[.-]/g, '_').toUpperCase()}`
    const fromEnv = typeof process !== 'undefined' ? process.env?.[envKey] : undefined
    if (fromEnv !== undefined) return fromEnv
    return full
  })
}

export function findUnresolvedVariables(markup: string): string[] {
  const keys = new Set<string>()
  const re = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markup)) !== null) keys.add(m[1])
  return [...keys]
}
