# Personal Agent Control Plane

## MVP Specification and Implementation Roadmap

**Version:** 0.1  
**Target:** Personal, single-machine application  
**Platform:** Local web application, desktop packaging optional later  
**Primary language:** TypeScript  
**Architecture:** Local-first modular monolith  
**Primary agent:** Codex  
**Additional providers:** Claude, local models, and future integrations

---

## 1. Product definition

### 1.1 Purpose

Build a unified personal workspace for conversations, project organization, task management, and AI-agent execution across an entire computer.

The application should make conversations actionable without requiring the user to manually copy information between a chat interface, task manager, and coding-agent application.

It should remain useful without autonomous AI behavior. Intelligent task discovery and automation enhance the underlying workspace rather than define its basic functionality.

### 1.2 Core concepts

- **Conversation:** A persistent discussion with an AI provider, optionally associated with a project.
- **Project:** An organizational container referencing one or more local directories or resources.
- **Task:** A persistent description of work, independent of any particular execution.
- **Action candidate:** A proposed task, decision, goal, or schedule derived from conversation analysis.
- **Run:** One execution attempt by an agent against a task.
- **Decision:** A recorded choice that can inform subsequent tasks and conversations.
- **Analysis:** An evaluation of conversation content that produces signals or action candidates.

### 1.3 Fundamental design principles

1. The application database is the source of truth for projects, tasks, and work state.
2. Agent providers own their internal inference and tool-execution behavior.
3. Conversations and tasks are separate but linked entities.
4. AI analysis produces suggestions; application services decide what gets persisted or executed.
5. Project organization is machine-wide, but execution permissions are scoped.
6. All provider-specific behavior is isolated behind adapters.
7. Every accepted suggestion preserves a link to the conversation that produced it.
8. Execution requires explicit authorization in the MVP.

---

## 2. MVP scope

### 2.1 Included features

| Feature                   | MVP requirement                                              |
| ------------------------- | ------------------------------------------------------------ |
| Project registry          | Create, edit, archive projects; assign local directories     |
| Conversational interface  | Start, resume, and stream Codex conversations                |
| Conversation organization | Associate chats with projects or leave them unassigned       |
| Task management           | Create, edit, prioritize, and track tasks                    |
| Manual chat actions       | Create a task or decision from selected conversation content |
| Ambient action detection  | Classify completed chat turns automatically                  |
| Structured extraction     | Generate draft tasks, goals, decisions, and schedules        |
| Suggestion inbox          | Review, accept, edit, dismiss, or defer candidates           |
| Agent execution           | Start a Codex run from an approved task                      |
| Run monitoring            | Display state, activity, output, errors, and approvals       |
| Persistence               | Preserve all application records across restarts             |
| Settings                  | Configure providers, analysis behavior, and permissions      |

**MVP provider scope:** Codex end to end. Design the provider abstraction immediately, but implement Claude integration after the primary workflow works.

### 2.2 Explicitly excluded

- Fully autonomous task creation and execution
- Cross-device synchronization
- Shared users and permissions
- External project-management integrations
- Automatic ingestion of existing ChatGPT or Claude chat histories
- Semantic search across the whole computer
- Agent-to-agent negotiation
- Multi-agent execution graphs
- Recurring scheduling and background operation while the machine is asleep
- Vector databases or long-term semantic memory
- Desktop packaging
- Complex analytics

These are extensions, not prerequisites.

---

## 3. Technology stack

| Layer               | Technology               | Responsibility                           |
| ------------------- | ------------------------ | ---------------------------------------- |
| Language            | TypeScript               | Shared frontend/backend types            |
| Runtime             | Node.js                  | Local server and agent supervision       |
| Monorepo            | pnpm workspaces          | Project organization                     |
| Frontend            | React + Vite             | Application interface                    |
| Component library   | shadcn/ui + Tailwind CSS | Dashboard, chat, dialogs, task board     |
| Client data         | TanStack Query           | Server state and cache invalidation      |
| Backend             | Fastify                  | HTTP endpoints and service orchestration |
| Database            | SQLite                   | Persistent application state             |
| ORM                 | Drizzle                  | Schemas, queries, migrations             |
| Validation          | Zod                      | Input and output contracts               |
| Streaming           | Server-Sent Events (SSE) | Live chat and run updates                |
| Primary agent       | Codex App Server         | Interactive chat and agent execution     |
| Automation agent    | Codex SDK                | Focused structured extraction            |
| Fast classification | OpenAI Decisions API     | Batched semantic predicates              |
| Local alternative   | Ollama or llama.cpp      | Replaceable classification backend       |
| Secondary agent     | Claude Agent SDK         | Later provider adapter                   |
| Testing             | Vitest + Playwright      | Unit, integration, and UI tests          |
| Logging             | Pino                     | Structured application logs              |

### 3.1 Deployment model

Use one local Node.js server with a React frontend.

The server supervises the Codex App Server subprocess, exposes application APIs, receives provider events, handles background analysis jobs, and accesses SQLite.

The application should bind to localhost by default.

Avoid Docker, Redis, a separate worker service, and external databases.

### 3.2 Provider authentication

**Codex:** Use supported local Codex/App Server authentication, including ChatGPT plan access where available. Usage remains subject to the user's plan limits.

**Decisions API:** Use an optional OpenAI API key. This is separately billed API usage, not ChatGPT subscription consumption.

**Claude:** Add a provider adapter with a supported authentication configuration. Anthropic's Agent SDK documentation directs application developers toward API-key authentication; do not assume a custom application can reuse Claude subscription authentication in the same way as Codex.

**Local classification:** No API key required when using an installed local model.

The provider configuration must separate authentication method, provider identity, model selection, and cost tracking.

---

## 4. Application interface

### 4.1 Primary navigation

Use five main areas.

| View      | Contents                                                     |
| --------- | ------------------------------------------------------------ |
| Workspace | Project navigation, recent activity, active work             |
| Chat      | Conversation history, provider selection, contextual actions |
| Tasks     | All tasks, project filters, statuses, priorities             |
| Inbox     | AI-generated suggestions awaiting review                     |
| Runs      | Agent execution history, live activity, approvals            |

Settings can live under a secondary menu.

### 4.2 Chat interface

Requirements:

- Start a new conversation.
- Select the provider and applicable model.
- Associate or reassociate the conversation with a project.
- Stream assistant responses.
- Display tool activity without exposing unnecessary internal event detail.
- Resume existing provider sessions.
- Interrupt running turns.
- Display permission requests and allow user responses.
- Create a task manually from selected messages.
- Display automatically detected suggestions beneath relevant messages.
- Open the task or project associated with a conversation.

Support two conversation modes:

**Chat:** Discussion, planning, brainstorming, and research, with restrictive tool access.

**Work:** A project-scoped agent conversation with explicitly configured filesystem and tool permissions.

Both modes use the same application-level conversation model.

### 4.3 Task interface

Each task contains:

- Title and description
- Project association
- Priority and status
- Optional due date
- Source conversation/message references
- Related tasks or dependencies
- Preferred provider
- Run history

Required operations:

Create, edit, archive, move between statuses, launch an agent run, and open the originating discussion.

### 4.4 Suggestion inbox

Suggestions must be displayed separately from committed tasks.

Each suggestion shows:

- Suggested action and type
- Associated project, if identified
- Relevant conversation excerpt
- Source conversation link
- Confidence or uncertainty indication
- Existing related task, if any
- Proposed operation: create, update, link, or record decision

Actions: **Accept, Edit, Dismiss, Defer.**

Accepting a suggestion must not automatically start an agent.

---

## 5. Application architecture

### 5.1 Main components

**Frontend**

Handles the interactive interface, application state, event subscriptions, and user approvals.

**Application API**

Provides validated endpoints for conversations, projects, tasks, suggestions, runs, and settings.

**Conversation service**

Manages the application's conversation records and mappings to provider-specific session IDs.

**Agent manager**

Starts provider processes, supervises their lifecycles, handles streaming, interruption, and provider-specific approvals.

**Task service**

Owns all task mutations and status transitions.

**Intelligence service**

Analyzes conversations, classifies signals, extracts structured candidates, and reconciles them with existing work.

**Policy service**

Determines which proposed actions may be persisted, suggested, scheduled, or executed.

**Event service**

Persists normalized events and broadcasts updates to connected clients.

**Persistence layer**

Manages SQLite access, transactions, migrations, and query functions.

### 5.2 Important separation

There are two distinct execution paths.

**Interactive path**

UI → Conversation API → Provider adapter → Codex/Claude → Normalized events → UI

**Intelligence path**

Completed conversation → Analysis job → Classification → Conditional extraction → Reconciliation → Suggestion inbox

The intelligence path runs independently and must not block conversational output.

---

## 6. Conversation intelligence architecture

This is the most important custom subsystem.

### 6.1 Objective

Continuously identify potentially meaningful actions in conversations while minimizing unnecessary model calls, false positives, and duplicate work.

Use an event-driven pipeline rather than a continuously running model process.

### 6.2 Trigger

Initial trigger: a conversational turn reaches a successful completed state.

The conversation service emits an internal `conversation.turn.completed` event.

The analysis service receives this event, creates a persistent analysis job, and processes it asynchronously.

Each job should be idempotent, keyed by the conversation, completed-turn identifier, and analysis-policy version.

Interrupted or failed turns should not automatically trigger normal completed-turn analysis.

### 6.3 Stage A: Context preparation

Construct an analysis window containing:

- Newly completed user and assistant messages
- A small number of preceding conversation turns
- Conversation-level summary when available
- Current project association
- Relevant existing task summaries
- Previously accepted or dismissed candidates

Prefer recent deltas over repeatedly analyzing the full transcript.

Keep stable message identifiers and boundaries so candidates can be traced to exact sources.

Only analyze content available to the application; do not assume access to ChatGPT's or Claude's external conversation histories.

### 6.4 Stage B: Batched classification

Send independent questions together through the selected classifier.

Initial questions:

| Question                       | Output    | Purpose                       |
| ------------------------------ | --------- | ----------------------------- |
| Contains actionable intent?    | Predicate | Broad actionability signal    |
| Contains a specific task?      | Predicate | Task detection                |
| Contains a project goal?       | Predicate | Goal detection                |
| Records or changes a decision? | Predicate | Decision detection            |
| Contains scheduling intent?    | Predicate | Time-related action detection |
| Modifies existing work?        | Predicate | Reconciliation detection      |
| Expresses a dependency?        | Predicate | Work graph detection          |

All questions examine the same contextual input.

Do not make the output types mutually exclusive. A conversation may contain several relevant signals.

A first-pass classifier should return normalized signal scores between 0 and 1.

### 6.5 Stage C: Routing policy

Apply deterministic thresholds to classification results.

Initial experimental policy:

| Signal outcome                                    | Handling                                 |
| ------------------------------------------------- | ---------------------------------------- |
| Every relevant signal below 0.20                  | Record and skip deeper analysis          |
| Any signal between 0.20 and 0.60, none above 0.60 | Defer or queue for optional verification |
| One or more signals above 0.60                    | Select relevant extraction branches      |

These thresholds are placeholders, not presumed calibrated probabilities.

**Important:** Evaluate the category-specific signals even when the broad actionability score is low. This avoids making an imperfect binary gate the single point of failure.

Record all initial scores for later evaluation.

### 6.6 Stage D: Conditional extraction

Route to the relevant extraction routines.

**Task extraction**

Identify the work item, intended outcome, scope, constraints, and strength of user commitment.

**Goal extraction**

Identify longer-term objectives without implying authorization to start them immediately.

**Decision extraction**

Identify decisions and distinguish firm choices from speculation, recommendations, and hypothetical examples.

**Schedule extraction**

Identify explicit dates, approximate timing, and ambiguous timing references. Do not invent dates.

**Existing-work reconciliation**

Determine whether new information proposes creating work or modifying an already recorded task.

Branches should run concurrently when independent.

For the first implementation, one structured-output extraction call may process multiple selected categories. Split into separate calls only when evaluation shows a meaningful advantage.

### 6.7 Stage E: Candidate normalization

All extracted items must conform to a shared action-candidate schema.

Required properties:

- Unique identifier
- Action type
- Title and description
- Project reference, if supported
- Source message IDs
- Evidence excerpt
- Commitment level
- Confidence estimate
- Suggested operation
- Proposed related task IDs
- Review status

Validate model output with Zod.

Reject unsupported project/task IDs and invalid source references.

Model-generated filesystem paths, command text, and execution parameters must not be treated as trusted instructions.

### 6.8 Stage F: Reconciliation

Before creating a new suggestion:

1. Compare against existing open candidates.
2. Match direct references to existing tasks or projects.
3. Check for previously dismissed suggestions.
4. Determine whether the candidate is new, duplicate, or an update.
5. Escalate ambiguous matches to a focused model evaluation when justified.

The initial matching system can use normalized text, source references, project associations, and existing task summaries.

A vector database is not required.

### 6.9 Stage G: Policy evaluation

The policy engine decides the allowed outcome:

- Ignore
- Save as a pending suggestion
- Link to existing work
- Request clarification
- Propose an update

No autonomous execution in the MVP.

Classification confidence cannot itself authorize a file modification, task execution, or external action.

### 6.10 Evaluation and observability

Record:

- Analysis input version
- Classifier and model configuration
- Individual signal scores
- Selected branches
- Extraction outcome
- Reconciliation decision
- User acceptance/dismissal
- Duration and reported token usage
- Failure information

Allow analysis to be disabled per conversation or project.

Create an initial evaluation corpus of approximately 100–200 manually labeled conversation windows.

Track false negatives, unwanted suggestions, duplicate proposals, and candidate acceptance rates.

The first optimization should be improving useful suggestion recall and quality, not minimizing fractions of a cent of classification expense.

---

## 7. Data model

Use SQLite and Drizzle. Keep persistent entities separate from provider-specific session state.

| Entity/table        | Key fields                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `projects`          | id, name, description, root_path, default_provider, settings, archived_at                      |
| `conversations`     | id, title, project_id, provider, external_thread_id, mode, created_at                          |
| `messages`          | id, conversation_id, external_message_id, role, content, sequence, status                      |
| `tasks`             | id, project_id, title, description, status, priority, due_at, preferred_provider               |
| `action_candidates` | id, type, title, description, project_id, status, confidence, proposed_operation               |
| `candidate_sources` | candidate_id, message_id, excerpt, source_start, source_end                                    |
| `runs`              | id, task_id, provider, external_session_id, status, working_directory, started_at, finished_at |
| `run_events`        | id, run_id, sequence, event_type, payload, created_at                                          |
| `analysis_jobs`     | id, conversation_id, turn_id, policy_version, status, started_at, finished_at                  |
| `analysis_results`  | id, job_id, classifier, signal_scores, routing_result, usage                                   |
| `decisions`         | id, project_id, title, description, source_candidate_id, status                                |
| `approval_requests` | id, run_id, provider_request_id, status, requested_action, resolution                          |

Relationships:

- One project has many conversations and tasks.
- One conversation has many messages and analysis jobs.
- One analysis job may produce multiple candidates.
- One candidate may reference multiple source messages.
- One task has many runs.
- One run has many events and potentially multiple approval requests.

Use explicit database transactions when accepting suggestions or creating runs.

### 7.1 Lifecycle states

**Task:** backlog, ready, in_progress, blocked, review, done, archived.

**Action candidate:** suggested, deferred, accepted, dismissed, superseded.

**Run:** queued, running, awaiting_approval, completed, failed, cancelled, interrupted.

**Analysis job:** pending, running, completed, failed, skipped.

A failed run does not automatically mean the underlying task is permanently failed.

---

## 8. Agent integration contract

Create a common adapter abstraction with the following capabilities:

| Operation           | Behavior                                  |
| ------------------- | ----------------------------------------- |
| Start conversation  | Create a provider-native session          |
| Send message        | Submit a new conversational turn          |
| Resume session      | Restore provider context when supported   |
| Subscribe to events | Receive structured incremental events     |
| Interrupt           | Request cancellation or interruption      |
| Start task run      | Execute approved task against a workspace |
| Handle approval     | Return a user's allow/deny decision       |
| Get capabilities    | Report supported provider features        |

Normalize common events:

- Session started
- Message started/updated/completed
- Tool invocation started/completed
- Approval requested/resolved
- Turn completed/failed/interrupted
- Run state changed

Retain raw provider events in diagnostic storage if needed, but expose normalized events to the frontend.

Do not assume session IDs, permission semantics, or tool-event structures are interchangeable across providers.

### 8.1 Codex adapter

Use Codex App Server as a locally supervised process.

Responsibilities:

- Initialize the App Server protocol.
- Create and resume threads.
- Submit turns.
- Stream responses and tool events.
- Translate approval requests.
- Handle interruption.
- Persist thread/run identifiers.
- Detect process termination and recover appropriately.

Use Codex SDK separately for bounded analysis or background tasks where its simpler interface is advantageous.

### 8.2 Claude adapter

Implement after the first Codex workflow passes acceptance testing.

Responsibilities mirror the Codex adapter, but use supported Claude Agent SDK sessions and permission callbacks.

Do not force Claude to mimic unsupported Codex operations. Expose provider capabilities to the application and disable unsupported controls.

### 8.3 Classification adapter

Define a provider-independent classifier with:

- Input evidence and context
- Named questions
- Normalized probabilities and choices
- Usage metadata
- Model/provider metadata
- Errors and timeout handling

Implement the Decisions API first.

A local-model implementation should later support equivalent semantic questions, but may use constrained JSON rather than native probability outputs.

If local model scores are not calibrated, represent them as uncalibrated confidence estimates rather than treating them as equivalent to Decisions API probabilities.

---

## 9. Backend services and interfaces

Use REST for mutations and standard resource reads. Use SSE for live events.

### 9.1 API groups

| API group     | Responsibilities                                     |
| ------------- | ---------------------------------------------------- |
| Projects      | Register directories, edit project metadata, archive |
| Conversations | Create/list, send turns, resume, interrupt           |
| Messages      | Read persisted history and source excerpts           |
| Tasks         | Create/update, change status, associate projects     |
| Candidates    | List, accept, edit, dismiss, defer                   |
| Runs          | Start, cancel, inspect history and results           |
| Approvals     | List pending requests, approve or deny               |
| Analysis      | Trigger evaluation, inspect results, reprocess       |
| Settings      | Configure providers and analysis behavior            |

### 9.2 Background execution

Maintain a persisted job queue in SQLite.

Initially support two job types:

- Conversation analysis
- Agent task execution

Implement a single in-process dispatcher with configurable concurrency and a basic retry policy.

On startup, reconcile jobs that were marked running. Determine whether an associated provider process or session can be resumed before declaring interruption or retrying.

Never automatically repeat a partially completed write-capable run.

### 9.3 Streaming

The event service should provide one normalized stream for conversation and run updates.

The frontend subscribes to relevant events and updates the corresponding React views.

Persist final events before broadcasting them where feasible. On reconnect, the frontend should be able to load the recorded state and resume from a known event sequence.

---

## 10. File and module structure

Organize the application as a pnpm workspace.

### Root

- `apps/web` — React application
- `apps/server` — Fastify application and background services
- `packages/shared` — Shared contracts and validation schemas
- `docs` — Architecture, provider notes, decisions, and test plans

### Frontend: `apps/web/src`

| Module              | Responsibility                                       |
| ------------------- | ---------------------------------------------------- |
| `app`               | Router, layouts, global providers                    |
| `features/chat`     | Conversation interface, message rendering, streaming |
| `features/projects` | Project registry, detail views, selectors            |
| `features/tasks`    | Task list, detail panels, task editor                |
| `features/inbox`    | Action candidate review                              |
| `features/runs`     | Execution timeline, output viewer, approvals         |
| `features/settings` | Provider and intelligence settings                   |
| `components/ui`     | Shared UI primitives                                 |
| `lib/api`           | Typed backend client                                 |
| `lib/events`        | SSE client and reconnection handling                 |
| `lib/state`         | Client-side UI state                                 |

### Backend: `apps/server/src`

| Module                     | Responsibility                                        |
| -------------------------- | ----------------------------------------------------- |
| `app`                      | Server bootstrap and lifecycle                        |
| `api`                      | Fastify routes and validation                         |
| `db`                       | Drizzle schema, migrations, database connection       |
| `projects`                 | Project CRUD and directory registry                   |
| `conversations`            | Conversation persistence and provider session mapping |
| `tasks`                    | Task lifecycle and updates                            |
| `candidates`               | Candidate persistence and review actions              |
| `runs`                     | Run lifecycle, execution queue, cancellation          |
| `agents/contracts`         | Shared agent adapter definitions                      |
| `agents/codex`             | Codex App Server integration                          |
| `agents/claude`            | Future Claude adapter                                 |
| `intelligence/context`     | Analysis-window construction                          |
| `intelligence/classifiers` | Decisions API and local classifier implementations    |
| `intelligence/router`      | Thresholds and conditional branch selection           |
| `intelligence/extractors`  | Structured candidate extraction                       |
| `intelligence/reconciler`  | Duplicate detection and task matching                 |
| `intelligence/evaluation`  | Classification and extraction test harness            |
| `policy`                   | Permission and action-authorization policies          |
| `events`                   | Event persistence and streaming                       |
| `jobs`                     | Background job dispatch and recovery                  |
| `security`                 | Path validation, permission boundaries, secrets       |
| `config`                   | Runtime configuration                                 |

### Shared contracts: `packages/shared/src`

- `models` — Entity and lifecycle types
- `schemas` — Zod validation schemas
- `events` — Normalized event definitions
- `providers` — Provider capabilities and configuration types
- `intelligence` — Classification and extraction result contracts

Keep domain services independent of Fastify handlers and database implementation details where practical, but avoid introducing elaborate repository interfaces solely for abstraction.

---

## 11. Security and operational constraints

### 11.1 Local execution

Bind the backend to localhost by default.

Use an explicit frontend origin allowlist and avoid exposing mutation endpoints on the local network.

The UI must never execute arbitrary shell commands directly.

### 11.2 Filesystem permissions

Register project roots explicitly.

Support separate read and write scopes for each task run.

Use provider sandbox and approval features as the execution boundary; application-level path selection alone is not sufficient.

Do not automatically make the user's home directory a universal writable workspace.

### 11.3 Concurrency

Start with one active write-capable run per project directory.

Introduce Git worktrees for parallel coding tasks in a later milestone.

### 11.4 Analysis permissions

Classification and extraction must not have unrestricted write or shell access.

Treat conversation contents, retrieved files, and model-generated suggestions as untrusted data.

### 11.5 Failure behavior

- Provider unavailable: show an error without losing the task.
- Classification unavailable: preserve chat and allow manual task creation.
- Extraction fails: retain the analysis job for retry or review.
- Server restarts: reconstruct persisted application state.
- Approval unresolved: leave the run blocked or safely interrupted.
- Run cancelled: preserve output and any recorded file changes.
- Malformed model output: reject without altering tasks.

Use structured logging and maintain a recoverable database backup strategy.

---

## 12. Implementation roadmap

### Milestone 0 — Foundation

**Goal:** Establish the local application architecture.

Implement:

- pnpm workspace
- React shell and navigation
- Fastify server
- SQLite and migrations
- Shared contracts
- Project registry
- Local configuration
- Basic integration test infrastructure

**Exit criteria:** Projects can be registered, persisted, edited, and reopened after restarting the application.

### Milestone 1 — Interactive Codex chat

**Goal:** Make the application usable as an independent chat client.

Implement:

- Codex App Server adapter
- Conversation/session persistence
- Streaming message interface
- Conversation history
- Project association
- Interrupt and resume functionality
- Provider error handling
- Approval handling

**Exit criteria:** A conversation can be started, continued, resumed after an application restart, and used to interact with an assigned workspace under appropriate permissions.

### Milestone 2 — Tasks and agent runs

**Goal:** Make conversations manually actionable.

Implement:

- Task CRUD
- Task statuses and priorities
- Manual task creation from chat
- Run creation from tasks
- Codex task execution
- Live run viewer
- Run/event persistence
- Execution cancellation
- Basic task/run association

**Exit criteria:** A user can create a task from a conversation, launch Codex against it, inspect its output, and continue the originating conversation.

### Milestone 3 — Ambient intelligence

**Goal:** Automatically recognize and suggest actionable work.

Implement:

- Completed-turn analysis events
- Context preparation
- Decisions API classifier
- Batched signal questions
- Threshold router
- Structured extraction through Codex
- Candidate normalization
- Basic duplicate detection
- Suggestion inbox
- Accept/edit/dismiss flows
- Source-message provenance

**Exit criteria:** Relevant conversation turns produce reviewable suggestions, irrelevant turns are generally ignored, and accepted candidates become persistent tasks or recorded decisions.

### Milestone 4 — Reliability and usable MVP

**Goal:** Make the workflow dependable enough for daily use.

Implement:

- Analysis-job idempotency
- Job and run recovery behavior
- Failed-analysis retries
- Candidate dismissal suppression
- Basic duplicate/update reconciliation
- Permission-policy refinements
- Provider diagnostics
- Configurable classifier thresholds
- Labeled evaluation suite
- Database backup/export
- End-to-end tests of the full lifecycle

**Exit criteria:** The complete chat-to-task-to-run workflow survives normal restarts and common provider failures without losing work or launching duplicate executions.

**This is the MVP release boundary.**

---

## 13. Post-MVP roadmap

### Phase 1 — Multiple providers

- Claude Agent SDK adapter
- Unified provider selection
- Capability-aware UI
- Per-project provider defaults
- Provider-specific usage statistics
- Optional local inference adapter

### Phase 2 — Better conversational intelligence

- Candidate updates based on subsequent chats
- Explicit links between conversations, tasks, goals, and decisions
- Conversation summarization
- Cross-conversation reconciliation
- Better project-context retrieval
- Calibrated classifier thresholds
- Compare Decisions API against local models
- User feedback-based evaluation dataset

### Phase 3 — Scheduling and automation

- One-time task scheduling
- Recurring schedules
- Persisted next-run timestamps
- Missed-run policies
- Approval rules per task category
- Execution concurrency limits
- Scheduled read-only audits
- Task dependencies and readiness checks

Scheduling should initially work only while the local service is running. OS-level launch services can later restart the application or scheduler automatically.

### Phase 4 — Multi-agent orchestration

- Git-worktree isolation
- Multiple simultaneous agents
- Parent/child task relationships
- Dependency graph
- Agent delegation
- Multi-provider workflows
- Review-agent pattern
- Workload prioritization
- Coordinator agent for project-level planning

### Phase 5 — Environment intelligence

- Local project discovery
- Search across authorized workspace metadata
- Persistent project-level context
- File-change triggers
- Git and GitHub integration
- Cross-project dependency tracking
- Calendar integration
- Environment-level planning and review

### Phase 6 — Desktop and remote capabilities

- Tauri or Electron packaging
- System tray and local notifications
- OS launch-at-login support
- Remote runner registration
- Cloud sync, if useful
- Mobile or remote management interface

---

## 14. MVP test and acceptance plan

### Functional tests

| Scenario                          | Expected result                                   |
| --------------------------------- | ------------------------------------------------- |
| Start and resume a chat           | Provider session and visible history persist      |
| Analyze an informational question | No irrelevant task is created                     |
| Discuss a concrete task           | Reviewable candidate appears                      |
| Discuss a hypothetical task       | No automatic execution; uncertainty preserved     |
| Discuss a task and date           | Both task and scheduling signals are retained     |
| Rephrase an existing task         | Duplicate candidate is avoided or flagged         |
| Dismiss a candidate               | Repeated analysis doesn't continually recreate it |
| Accept a suggestion               | A task is created with conversation provenance    |
| Launch an approved task           | One tracked run starts                            |
| Interrupt a run                   | Execution stops and final state is recorded       |
| Encounter a permission request    | User can approve or deny within the app           |
| Restart during execution          | State is recovered or safely marked interrupted   |
| Classifier becomes unavailable    | Chat and manual task management remain functional |

### Quality targets

Initial targets, to be refined with real data:

- No unauthorized automatic task execution.
- No duplicate run dispatch from one approved action.
- All accepted tasks retain provenance.
- Recoverable conversations and task records after normal restarts.
- Classification and extraction failures are visible and retryable.
- Analyze chat asynchronously without blocking response streaming.
- Favor recall over aggressive suppression of uncertain suggestions.
- Track suggestion acceptance and false-negative rates before tuning thresholds.

---

## 15. Implementation priorities and design tradeoffs

### Decisions to make now

- Use a modular monolith instead of microservices.
- Use SQLite as the persistent source of truth.
- Start with Codex App Server.
- Separate conversation state from task state.
- Implement manual actions before AI-generated suggestions.
- Batch independent classification questions.
- Use conditional extraction rather than multiple unconditional agent calls.
- Require human approval before execution.
- Preserve source-message provenance.
- Make provider integration replaceable.

### Decisions to postpone

- Whether to replace the Decisions API with a local model.
- Whether separate extraction agents outperform one structured extraction call.
- Whether semantic embeddings materially improve reconciliation.
- Whether to introduce a formal workflow engine.
- Whether to support unrestricted machine-wide execution.
- Whether to package the app as a native desktop application.
- Whether autonomous planning should be permitted.

These decisions should follow operational evidence rather than speculative optimization.

---

## 16. Suggested first vertical slice

Build the smallest complete sequence:

1. Register one project directory.
2. Start a Codex conversation.
3. Send and receive a streamed message.
4. Manually convert the message into a task.
5. Run the task through Codex.
6. See the completed run and return to the conversation.

Then add one independent intelligence feature:

7. On a completed turn, send a batched Decisions request.
8. If sufficiently relevant, produce a structured action candidate.
9. Display it in an inbox for approval.
10. Accept it into the same task system already used for manual creation.

This ensures the intelligence layer is optional and replaceable rather than tightly coupled to the UI.

---

## 17. Definition of done

The MVP is complete when a user can manage multiple local projects, hold persistent Codex conversations, turn those conversations into tasks manually or through AI-generated suggestions, execute approved work, and inspect the results within one application.

The application must remain functional when conversation analysis is disabled.

It must preserve project, task, conversation, candidate, and run records independently of any individual agent session.

**The resulting product is a personal work control plane with conversational intelligence—not simply a custom chat client and not yet an autonomous agent operating system.**

That distinction establishes a stable foundation for later multi-agent orchestration without requiring a large initial architecture.
