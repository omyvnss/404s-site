// Every step = run() + verify(). A step's output only moves forward once its
// verifier passes. Failed verification is fed back into the next attempt
// (useful for AI steps), and a step that never verifies rejects the candidate.

export type Verdict = { ok: true; note?: string } | { ok: false; reason: string; retry?: boolean }

export interface Step<I, O> {
  name: string
  /** `feedback` is the previous verifier's rejection reason, if any. */
  run(input: I, feedback?: string): Promise<O>
  verify(output: O, input: I): Promise<Verdict> | Verdict
  /** Total tries including the first (default 1; AI steps use more). */
  attempts?: number
}

export interface TraceEntry {
  candidate: string
  step: string
  attempt: number
  ok: boolean
  detail: string
  ms: number
}

export class StepRejected extends Error {
  constructor(public step: string, public reason: string) {
    super(`${step}: ${reason}`)
  }
}

export const trace: TraceEntry[] = []

export async function runStep<I, O>(step: Step<I, O>, input: I, candidate: string): Promise<O> {
  const attempts = step.attempts ?? 1
  let feedback: string | undefined

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = Date.now()
    let output: O
    try {
      output = await step.run(input, feedback)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      log(candidate, step.name, attempt, false, `run failed: ${reason}`, started)
      feedback = reason
      continue
    }

    let verdict: Verdict
    try {
      verdict = await step.verify(output, input)
    } catch (err) {
      verdict = { ok: false, reason: `verifier crashed: ${err instanceof Error ? err.message : String(err)}` }
    }

    if (verdict.ok) {
      log(candidate, step.name, attempt, true, verdict.note ?? 'verified', started)
      return output
    }
    log(candidate, step.name, attempt, false, verdict.reason, started)
    if (verdict.retry === false) throw new StepRejected(step.name, verdict.reason)
    feedback = verdict.reason
  }
  throw new StepRejected(step.name, feedback ?? 'failed verification')
}

function log(candidate: string, step: string, attempt: number, ok: boolean, detail: string, started: number) {
  const ms = Date.now() - started
  trace.push({ candidate, step, attempt, ok, detail: detail.slice(0, 300), ms })
  console.log(`${ok ? '  ✓' : '  ✗'} ${step}${attempt > 1 ? ` (try ${attempt})` : ''} — ${detail.slice(0, 160)}`)
}
