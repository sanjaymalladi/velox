import readline from 'readline'
import chalk from 'chalk'

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

const BAR_WIDTH = 32

/** Stream used for the live progress line (must stay on one stream for in-place updates). */
const OUT = process.stdout

function clearProgressLine(): void {
  if (!OUT.isTTY) return
  readline.cursorTo(OUT, 0)
  readline.clearLine(OUT, 0)
}

/**
 * Single in-place terminal progress bar with ETA and render throughput.
 */
export class RenderProgress {
  private readonly startedAt = Date.now()
  private lastWriteAt = 0
  private readonly renderTotal: number
  private active = false

  constructor(
    private readonly sourceTotal: number,
    private readonly label: string,
    frameStep = 1,
  ) {
    this.renderTotal = Math.ceil(sourceTotal / Math.max(1, frameStep))
  }

  /** Reserve the progress line (call after spinners / banner logs finish). */
  begin(): void {
    this.active = true
    if (OUT.isTTY) OUT.write('\n')
  }

  /** @param renderedIndex 0-based count of encoded frames */
  update(renderedIndex: number, sourceFrame: number): void {
    if (!this.active) return
    const now = Date.now()
    const isDone = renderedIndex >= this.renderTotal - 1
    if (!isDone && now - this.lastWriteAt < 80) return
    this.lastWriteAt = now

    const progress = Math.min(1, (renderedIndex + 1) / this.renderTotal)
    const elapsedSec = (now - this.startedAt) / 1000
    const fps = renderedIndex > 0 ? renderedIndex / elapsedSec : 0
    const remaining = this.renderTotal - (renderedIndex + 1)
    const etaSec = fps > 0 ? remaining / fps : 0

    const filled = Math.round(progress * BAR_WIDTH)
    const bar =
      chalk.hex('#6C63FF')('█'.repeat(filled)) +
      chalk.gray('░'.repeat(Math.max(0, BAR_WIDTH - filled)))

    const pct = (progress * 100).toFixed(1).padStart(5, ' ')
    const frameLabel = `${String(renderedIndex + 1).padStart(String(this.renderTotal).length, ' ')}/${this.renderTotal}`
    const srcLabel =
      sourceFrame !== renderedIndex ? chalk.gray(` (src ${sourceFrame}/${this.sourceTotal - 1})`) : ''

    const line =
      `${bar} ${pct}%  ${frameLabel}${srcLabel}  ` +
      `${chalk.cyan(fps > 0 ? `${fps.toFixed(1)} fps` : '— fps')}  ` +
      `ETA ${chalk.yellow(formatDuration(etaSec))}  ` +
      chalk.gray(this.label)

    if (OUT.isTTY) {
      clearProgressLine()
      OUT.write(line)
    } else if (isDone || renderedIndex % Math.max(1, Math.floor(this.renderTotal / 25)) === 0) {
      OUT.write(`${line}\n`)
    }
  }

  done(outputPath: string, sizeMb: string): void {
    const elapsedSec = (now() - this.startedAt) / 1000
    clearProgressLine()
    if (OUT.isTTY) OUT.write('\n')
    console.log(
      chalk.green(`✨ Done in ${formatDuration(elapsedSec)}`) +
        ` → ${chalk.bold(outputPath)} ${chalk.gray(`(${sizeMb} MB)`)}`,
    )
    this.active = false
  }

  fail(message: string): void {
    clearProgressLine()
    if (OUT.isTTY) OUT.write('\n')
    console.error(chalk.red(message))
    this.active = false
  }
}

function now(): number {
  return Date.now()
}
