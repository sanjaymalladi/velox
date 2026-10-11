// Minimal type shim for Playwright so the headless renderer type-checks
// without requiring Playwright to be installed. It is loaded dynamically at
// runtime; install with `pnpm add -D playwright && npx playwright install`.
declare module 'playwright' {
  export interface Page {
    goto(url: string, opts?: { waitUntil?: string }): Promise<void>
    evaluate<T = unknown>(fn: (...args: never[]) => T, ...args: unknown[]): Promise<T>
    close(): Promise<void>
  }
  export interface Browser {
    newPage(): Promise<Page>
    close(): Promise<void>
  }
  export interface Chromium {
    launch(opts?: { headless?: boolean; args?: string[] }): Promise<Browser>
  }
  export const chromium: Chromium
}
