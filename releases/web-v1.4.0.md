# WEB v1.4.0

**Released:** November 07, 2026
**Feature:** Dixon–Coles simulation panel + confederation pages

## Changes

- Added the Match Simulation panel to the Head-to-Head page: Dixon–Coles
  bivariate Poisson Monte Carlo with win/draw/loss probabilities, expected
  goals, run spinner + elapsed time, completion line (duration, sims,
  matches, timestamp), and results dimmed while running.
- Fixed the simulation count input: free-text draft while typing, clamping
  to [100, 100000] only on blur/Enter; ± buttons step by 100.
- Added confederation menu, list and detail pages; confederation match table.
- Date filters are now usable to type in and clearable; no longer reset while
  typing.
- Year detail page shows a match table; confederation pages reuse shared match
  components.
- 70 web tests pass, lint 0 errors, tsc clean.
