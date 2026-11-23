# ATLAS ARI — full-capability UWS tool connector (v0.2)

**Source-only feature branch; not a hosted deployment.** These two standalone Python 3.12+ tools are shared with the DragonSeek constitutional fork:

- `uws_gateway.py`: calls the **real** [Universal Workspace CLI](https://github.com/atlaslattice/uws), supporting both retrieval and modifications across whichever providers you have configured. Full UWS service names and methods are accepted structurally and passed through to UWS's own schema validation.
- `uws_tool_agent.py`: **GPT-centric** OpenAI-compatible chat-completions model loop. Registers the `uws_call` function so the model can request UWS reads/writes and receive actual tool outputs. By default, use OpenAI's HTTPS endpoint with `OPENAI_MODEL` and `OPENAI_API_KEY` set.

## Set up

Install/build [atlaslattice/uws](https://github.com/atlaslattice/uws) on the machine running the agent. Authenticate the accounts *you choose* using the CLI's OAuth/provider setup. Provider keys and tokens must remain local, never be committed to this public repository. UWS may expose Google Workspace, Microsoft 365, Apple iCloud, Android and Chrome APIs; exact API availability/quotas and charges depend on provider and credentials. This integration does not create OAuth credentials.

From this repository root, preview a UWS command without contacting the provider:

```bash
python3 integrations/uws_gateway.py --params '{"pageSize":10}' drive files list
```

Perform an authenticated read:

```bash
python3 integrations/uws_gateway.py --execute --params '{"pageSize":10}' drive files list
```

Run GPT-centric Atlas ARI with **actual model inference and tool calling**:

```bash
export OPENAI_API_KEY='SET_LOCALLY_NOT_IN_REPO'
export OPENAI_MODEL='YOUR_SUPPORTED_TOOL_CALLING_MODEL'
python3 integrations/uws_tool_agent.py --persona ari \
  --model "$OPENAI_MODEL" \
  --ask "Find my recent Drive documents about Atlas Prime" \
  --tools --execute --allow-remote
```

Without `--execute`, this prints the inference and tool schema preview only. Without `--tools`, the model has no UWS tool access. For a compatible local model, use `--endpoint http://127.0.0.1:11434/v1/chat/completions` and omit `--allow-remote`. When remote inference is enabled, **private retrieved UWS results can be transmitted to the selected model provider**.

Execute a write from an **interactive local terminal**:

```bash
python3 integrations/uws_gateway.py --execute \
  --body '{"name":"ATLAS Research Workspace","mimeType":"application/vnd.google-apps.folder"}' \
  drive files create
```

Before mutation, the gateway executes UWS's native `--dry-run`, prints its preview, and requires the human to type `APPROVE <proposal_id>`. An AI cannot approve its own write; an automated host must provide a separately trusted user-confirmation callback. Unknown UWS verbs are *not* blocked wholesale; they are classified conservatively as approval-required.

## Architecture and boundaries

```text
User ↔ Atlas Prime model (OpenAI-compatible endpoint)
            ↕ tool calls
      UWS tool-call agent
            ↕ permission-aware gateway
       UWS Rust CLI + OAuth
     ↙ Google   ↘ Microsoft   ↘ Apple/Android/Chrome
            ↘ private results → model if explicitly configured
```

- Each write requires per-operation authorization; constitutional `memory != permission` holds.
- Source content and model output cannot self-ratify doctrine/canon or authenticate a government deployment.
- Commands are structured argument lists, never shell commands.
- Read results and provider API responses stay local unless deliberately sent to a selected model endpoint.
- The existing browser `server.ts` proxy is a **scaffold** and presently returns a mock response, *not* real verified provider inference. This CLI route is the working candidate for real inference and UWS invocation; **browser/tool-server integration still requires a secured user session and authenticated approval UI**. Never expose this gateway as an unauthenticated public execution endpoint.
- Mocked integration tests are in `integrations/tests`; no provider OAuth or live UWS runtime tests have yet been performed in this workflow.

## Integration source map

- [DragonSeek v1.6.2 review branch](https://github.com/atlaslattice/manus-artifacts/tree/feature/dragonseek-v162-constitutional-registry-20261011/research/dragonseek_1_6_2)
- [UWS Rust CLI + MCP transport](https://github.com/atlaslattice/uws)
- [Sheldonbrain RAG API and evidence graph](https://github.com/atlaslattice/sheldonbrain-rag-api)
- [Element 145 experimental SHUGS implementation](https://github.com/atlaslattice/element-145/tree/main/shugs)
- [GPTDream/UWS fork plan](https://github.com/atlaslattice/manus-artifacts/blob/master/docs/gptdream/GPTBRAIN_GPTDREAM_UWS_FORK_PLAN_v0.1.md)

**No overwrite of prior canon, no deployed claim, no realized credit.**
