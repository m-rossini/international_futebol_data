# International Football Data Stats

A Python project to extract statistics from international football match data.

## Data Files

| File | Rows | Description |
|------|------|-------------|
| `results.csv` | 49,329 | Match results: date, teams, score, tournament, location |
| `goalscorers.csv` | 47,602 | Goal scorers per match: player, minute, own_goal, penalty |
| `shootouts.csv` | 678 | Penalty shootout winners |
| `former_names.csv` | 37 | Historical country name mappings |

## Setup

```bash
cd football_stats
pip install -r requirements.txt
```

## Usage

```bash
# General summary
python main.py

# Top 20 goal scorers
python main.py --top-scorers

# Top 10 biggest wins
python main.py --biggest-wins

# Stats for a specific team
python main.py --team "Brazil"

# Head-to-head between two teams
python main.py --h2h "Brazil" "Argentina"

# Show everything
python main.py --all
```
