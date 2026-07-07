# Engineering Agent Rules

## Tool Usage Priority

When information can be obtained from a tool, prefer tools over assumptions.

Priority order:

1. MCP servers
2. Local repository
3. Project documentation
4. External documentation
5. Model knowledge

Never invent information that can be retrieved from an available MCP server.

---

## GitHub

When a GitHub MCP server is available:

- Use GitHub MCP to inspect:
  - issues
  - pull requests
  - workflows
  - releases
  - repository metadata

Prefer GitHub MCP over parsing URLs manually.

---

## Jira

When a Jira MCP server is available:

- Use Jira MCP for:
  - ticket details
  - status
  - acceptance criteria
  - linked issues
  - comments

Do not assume ticket requirements when Jira data is accessible.

---

## Documentation

When documentation MCP servers are available:

- Prefer MCP documentation sources.
- Verify APIs against documentation before implementation.
- Do not rely solely on model memory for framework behaviour.

Examples:
- Library documentation MCP
- Internal documentation MCP
- Confluence MCP
- OpenAPI MCP

---

## Development Workflow

Before implementing:

1. Understand the task.
2. Gather context from MCP tools.
3. Inspect relevant code.
4. Produce an implementation plan.
5. Implement incrementally AFTER asking if you coudl proceed
6. Validate changes.
1. Use Make targets whenever possible

---

## Testing Priority

Preferred validation order:

1. Containers
2. Existing project test harness
3. Local execution
4. Static analysis

When container definitions exist:

- Prefer containers for:
  - tests
  - builds
  - linting
  - integration validation

Examples:
- docker-compose.yml
- compose.yaml
- Containerfile
- Dockerfile
- devcontainer

Do not install dependencies on the host if a container workflow exists.

Sometime swe work with git worktrees. When that isth e case using continaers can cause conflicts between tests. You need ot understand that we have either to wait for the contianer to not be used by another agent OR prefereably to create a new instance with the same properties and other name. Do not use existing containers that are already running. THI SIS VERY IMPORTANT

---

## Container Rules

If container definitions are present:

- Execute commands inside containers whenever practical.
- Reuse existing project containers.
- Avoid creating new container infrastructure unless required.
- Prefer reproducible container-based workflows.

When multiple execution environments exist:

1. Existing project containers
2. Existing development containers
3. Local host execution

---

## Change Validation

Before completing work:

- Run relevant tests.
- Run linters when available.
- Run type checking when available.
- Verify modified functionality.

Report:

- Commands executed
- Validation performed
- Remaining risks
- Untested areas

---

## Safety Rules

Do not:

- Rewrite large sections unnecessarily.
- Change unrelated code.
- Introduce new dependencies without justification.
- Disable tests to make builds pass.
- Never Fix Tests by Changing production code, ALWAYS give the options and I decide which one to take
- Never implement without asking me before
- NEVER DOWNLOAD SOFTWARE
- NEVER PUSH TO GIT, EVEN WHEN I ASK. NEVER.
- NEVER ACCESS FILES OUTSIDE THE BOUNDARIES OF CURRENT DIRECTORY.
- NEVER DELETE FILES

Prefer minimal, targeted changes.

## Implementation Rules

- You never touch MAIN branch
- You checjk the branch you are in and make a new one for that task in hand
- You create small commits for every stepp in the plan, the flow is execute, test, commit when done, next step, repeat
