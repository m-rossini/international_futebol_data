# API v1.0.2

**Released:** July 4, 2026
**Feature:** Tournament Detail

## Changes

- Fixed tournament detail - multiple hosts, clickable teams, all teams list
- Fixed tournament team standings with W/L ratio, sortable columns
- Refactored: reuse Teams page columns in tournament detail
- Fixed win_loss_ratio NaN not JSON-serializable
- Refactored: extract TeamTable as reusable presentational component
