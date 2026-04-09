# Prime Factory

A telemetry dashboard for [Dark Factory](https://github.com/nguyenhuynhkhanh/dark-factory) — track CLI usage, developer activity, and feature pipeline health across your team.

## What it does

- **API key management** — generate and revoke install keys for developers
- **Event explorer** — filter and paginate telemetry events by command, outcome, date range, and machine
- **Dashboard stats** — at-a-glance view of activity across your org

## Stack

- Next.js 16 (App Router) on Cloudflare Workers via `@opennextjs/cloudflare`
- D1 (SQLite) via Drizzle ORM
- Tailwind CSS v4

## Developer CLI

Developers interact with Prime Factory through shell scripts in `cli-lib/`. They never touch the dashboard directly.

### Prerequisites

- `curl` — required to download and run the install script

> `jq` is **not** required. The CLI scripts have built-in fallbacks and do not depend on `jq`.

### One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

> **Security note:** This command pipes the install script directly to bash. If you prefer to review the script before running it, download and inspect it first:
> `https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh`

This installs three scripts to `~/.df-factory/bin`:

| Script | Purpose |
|---|---|
| `df-onboard.sh` | First-time setup — validates API key and writes `~/.df-factory/config.json` |
| `df-check-onboard.sh` | Offline guard — checks config exists before running df commands |
| `log-event.sh` | Fire-and-forget telemetry — called automatically by Dark Factory skills |

The installer also adds `~/.df-factory/bin` to your PATH by appending the following line to `~/.zshrc` (macOS) or `~/.bashrc` (Linux):

```bash
export PATH="$HOME/.df-factory/bin:$PATH"
```

Re-running the install command is safe — it will not add a duplicate PATH entry.

### Onboarding a developer

1. Go to the dashboard → **API Keys** → generate a new key
2. Share the key and the install command above with the developer
3. After running the install, activate the PATH change:
   ```bash
   source ~/.zshrc   # macOS
   # or
   source ~/.bashrc  # Linux
   ```
4. Run the onboarding script. You can use the full path immediately after install (before sourcing):
   ```bash
   ~/.df-factory/bin/df-onboard.sh
   ```
   Or use the bare name once the PATH is active (after `source ~/.zshrc` or a new terminal):
   ```bash
   df-onboard.sh
   ```
5. Enter the server URL and API key when prompted
6. Done — events flow automatically from their Dark Factory CLI usage

### Upgrading

Re-run the install command to upgrade to the latest version of the CLI scripts. The operation is idempotent — scripts are overwritten and no duplicate PATH entries are added:

```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

### Uninstalling

1. Remove the CLI directory:
   ```bash
   rm -rf ~/.df-factory/
   ```

2. Remove the PATH line from your shell profile. Open `~/.zshrc` (macOS) or `~/.bashrc` (Linux) in your editor and delete the line:
   ```
   export PATH="$HOME/.df-factory/bin:$PATH"
   ```
   Or run the following one-liner (replace `~/.zshrc` with `~/.bashrc` if on Linux):
   ```bash
   grep -v 'export PATH="$HOME/.df-factory/bin:$PATH"' ~/.zshrc > /tmp/zshrc_clean && mv /tmp/zshrc_clean ~/.zshrc
   ```

## Running locally

```bash
npm install
npm run db:setup   # create and migrate local D1
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

```bash
npm run deploy
```

Builds with `opennextjs-cloudflare` and deploys to Cloudflare Workers + D1.

## Running tests

```bash
npm test   # bats tests for the CLI scripts (requires bats-core)
```
