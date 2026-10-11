# Native render benchmark fixtures

These fixed 720p/24fps VML files isolate four common workloads: static composition, entrance/loop motion, chart drawing, and scene transitions.

From the repository root, run:

    pnpm benchmark:render

The command builds the current packages, renders all cases with profiling enabled, and writes outputs plus a combined JSON summary to a temporary directory. The command prints that directory. Compare runs on the same machine and keep resolution, FPS, quality, and software build fixed. These fixtures measure renderer cost; they do not measure subjective design quality.
