#!/usr/bin/env bats
# Promoted from Dark Factory holdout: api-key-management-ui
# Root cause: UI components must enforce one-time key reveal security (modal cannot
#   be dismissed until confirmed), revoke must not cascade-delete events, badge
#   priority must check revokedAt first, and null computerName/gitUserId must
#   render as em-dash placeholders with XSS-safe JSX expression rendering.
# Guards: app/(dashboard)/installs/GenerateKeyModal.tsx,
#         app/(dashboard)/installs/InstallsPageClient.tsx,
#         app/(dashboard)/layout.tsx,
#         app/(dashboard)/settings/RenameOrgForm.tsx,
#         app/api/v1/dashboard/events/route.ts,
#         app/api/v1/installs/[id]/revoke/route.ts

PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

# ── H-01: Modal close without copying requires confirmation ───────────────────

@test "H-01-A: GenerateKeyModal overlay div has no onClick handler on the backdrop" {
  # Scenario A (backdrop click) + Scenario B: the outer overlay div must not have
  # an onClick that would close the modal. The only onClick allowed is inside the
  # inner content div (for the copy button / confirmed-copy button).
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/GenerateKeyModal.tsx', 'utf8');
    // Find the outer overlay div (fixed inset-0 overlay).
    const overlayIdx = src.indexOf('fixed inset-0');
    if (overlayIdx === -1) { process.stderr.write('overlay div not found\n'); process.exit(1); }
    // Extract a region from the opening <div with fixed inset-0 up to the next newline after the >
    // Find the start of the <div tag that contains fixed inset-0
    const tagStart = src.lastIndexOf('<div', overlayIdx);
    const tagEnd = src.indexOf('>', tagStart);
    const tag = src.slice(tagStart, tagEnd + 1);
    if (tag.includes('onClick')) {
      process.stderr.write('onClick found on the backdrop overlay div — must not close on click\n');
      process.exit(1);
    }
  "
}

@test "H-01-B: GenerateKeyModal revealed phase renders no X or close button" {
  # Scenario C: once in the revealed state there must be no X/close button that
  # would allow dismissal. Only the 'I\'ve copied it' button is permitted.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/GenerateKeyModal.tsx', 'utf8');
    // Find the revealed phase block (state.kind === 'revealed')
    const revealedIdx = src.indexOf(\"state.kind === 'revealed'\") !== -1
      ? src.indexOf(\"state.kind === 'revealed'\")
      : src.indexOf('kind: \"revealed\"') !== -1
        ? src.indexOf('kind: \"revealed\"')
        : src.indexOf(\"kind === 'revealed'\");
    // Locate the revealed JSX branch: it is in the else branch of state.kind === 'form'
    // We check that the revealed block does not contain aria-label='close' or title='Close'
    // or a button with × / X text.
    const lowerSrc = src.toLowerCase();
    // The revealed phase is in the second branch of the ternary.
    // Find 'I\\'ve copied it' button as anchor, and check there's no close/× button nearby.
    const copiedIdx = src.indexOf(\"I\");
    // Simple structural check: no button containing '×', 'Close', or 'aria-label=\"close\"'
    // in the component source at all (neither phase should have a static close button).
    if (src.includes('aria-label=\"Close\"') || src.includes(\"aria-label='Close'\")) {
      process.stderr.write('Close button with aria-label found — must not exist in revealed phase\n');
      process.exit(1);
    }
    // No explicit ×/✕ close character in a button
    if (src.includes('>×<') || src.includes('>✕<') || src.includes('>&times;<')) {
      process.stderr.write('× close button found — must not exist\n');
      process.exit(1);
    }
  "
}

@test "H-01-C: GenerateKeyModal onSuccess is only called from handleConfirmedCopy" {
  # Scenario D: parent refresh via onSuccess must only be triggered after the admin
  # clicks 'I've copied it' (handleConfirmedCopy), NOT immediately after the POST.
  # This means onSuccess(label) must NOT appear directly in the 201 response handler.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/GenerateKeyModal.tsx', 'utf8');
    // Find handleConfirmedCopy and verify it calls onSuccess
    if (!src.includes('handleConfirmedCopy')) {
      process.stderr.write('handleConfirmedCopy not found\n'); process.exit(1);
    }
    const confirmIdx = src.indexOf('function handleConfirmedCopy');
    if (confirmIdx === -1) { process.stderr.write('handleConfirmedCopy function definition not found\n'); process.exit(1); }
    const confirmFn = src.slice(confirmIdx, confirmIdx + 200);
    if (!confirmFn.includes('onSuccess')) {
      process.stderr.write('onSuccess not called inside handleConfirmedCopy\n'); process.exit(1);
    }
    // Verify that the 201 response branch (status === 201) does NOT directly call onSuccess
    const res201Idx = src.indexOf('201');
    if (res201Idx === -1) { process.stderr.write('201 response check not found\n'); process.exit(1); }
    // The region immediately after '=== 201' must not contain 'onSuccess' before the setState call
    const region201 = src.slice(res201Idx, res201Idx + 300);
    // setState for revealed phase should come before any onSuccess reference
    if (region201.indexOf('onSuccess') !== -1 && region201.indexOf('setState') !== -1) {
      if (region201.indexOf('onSuccess') < region201.indexOf('setState')) {
        process.stderr.write('onSuccess called before setState in 201 branch — parent would refresh before key is shown\n');
        process.exit(1);
      }
    } else if (region201.indexOf('onSuccess') !== -1 && region201.indexOf('setState') === -1) {
      process.stderr.write('onSuccess called in 201 branch without setState — modal closes before key is shown\n');
      process.exit(1);
    }
  "
}

@test "H-01-D: InstallsPageClient calls router.refresh() inside handleModalSuccess after setIsModalOpen(false)" {
  # Scenario D cont.: the parent refresh must occur in the onSuccess handler
  # (handleModalSuccess), not triggered by any other event. Refresh happens AFTER
  # modal is closed, not while key is still visible.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    const fnIdx = src.indexOf('handleModalSuccess');
    if (fnIdx === -1) { process.stderr.write('handleModalSuccess not found\n'); process.exit(1); }
    const fnBody = src.slice(fnIdx, fnIdx + 300);
    if (!fnBody.includes('router.refresh')) {
      process.stderr.write('router.refresh() not found in handleModalSuccess\n'); process.exit(1);
    }
    if (!fnBody.includes('setIsModalOpen')) {
      process.stderr.write('setIsModalOpen not found in handleModalSuccess\n'); process.exit(1);
    }
  "
}

# ── H-02: Revoked install's historical events still appear in the event feed ──

@test "H-02-A: revoke route performs UPDATE only on installs — no DELETE on events" {
  # The PATCH /api/v1/installs/[id]/revoke handler must not issue any DELETE or
  # UPDATE against the events table. Revoking must be non-destructive to event history.
  run grep -i "DELETE\|delete" "$PROJECT_ROOT/app/api/v1/installs/[id]/revoke/route.ts"
  [ "$status" -ne 0 ]
}

@test "H-02-B: revoke route sets revokedAt only — no events table reference" {
  run grep "events" "$PROJECT_ROOT/app/api/v1/installs/[id]/revoke/route.ts"
  [ "$status" -ne 0 ]
}

@test "H-02-C: events dashboard query has no WHERE filter on installs.revokedAt" {
  # The GET /api/v1/dashboard/events handler must not exclude revoked install rows.
  # Any 'revokedAt IS NULL' or 'revoked_at IS NULL' in the events query would
  # hide historical events from revoked installs (violating BR-7 / EC-9).
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/dashboard/events/route.ts', 'utf8');
    if (src.toLowerCase().includes('revokedat') && src.toLowerCase().includes('isnull')) {
      process.stderr.write('revokedAt IS NULL filter found in events route — would hide events from revoked installs\n');
      process.exit(1);
    }
    if (src.toLowerCase().includes('revoked_at is null')) {
      process.stderr.write('revoked_at IS NULL raw SQL found in events route\n');
      process.exit(1);
    }
  "
}

# ── H-03: Revoked badge overrides Active and Pending states ──────────────────

@test "H-03-A: getStatus checks revokedAt before isActivated (priority order)" {
  # FR-4 / BR-1: the revokedAt check must appear BEFORE the isActivated check
  # in the getStatus function so that a revoked install never shows as Active or Pending.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    const fnIdx = src.indexOf('function getStatus');
    if (fnIdx === -1) { process.stderr.write('getStatus not found\n'); process.exit(1); }
    const fnBody = src.slice(fnIdx, fnIdx + 500);
    const revokedCheckIdx = fnBody.indexOf('revokedAt');
    const activatedCheckIdx = fnBody.indexOf('isActivated');
    if (revokedCheckIdx === -1) { process.stderr.write('revokedAt check not found in getStatus\n'); process.exit(1); }
    if (activatedCheckIdx === -1) { process.stderr.write('isActivated check not found in getStatus\n'); process.exit(1); }
    if (revokedCheckIdx > activatedCheckIdx) {
      process.stderr.write('isActivated is checked before revokedAt — priority order wrong\n');
      process.exit(1);
    }
  "
}

@test "H-03-B: getStatus returns 'revoked' string for the revokedAt branch" {
  run grep '"revoked"' "$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx"
  [ "$status" -eq 0 ]
}

@test "H-03-C: StatusBadge renders bg-red-100 and text-red-700 for revoked status" {
  # EC-1 / EC-2: revoked badge must use red Tailwind classes as per spec NFR-2.
  run grep "bg-red-100" "$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx"
  [ "$status" -eq 0 ]
  run grep "text-red-700" "$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx"
  [ "$status" -eq 0 ]
}

@test "H-03-D: revoked row renders no enabled Revoke button — shows dash placeholder" {
  # FR-7 / AC-9: when isRevoked is true the Actions column must not render an
  # enabled Revoke button. The implementation renders a '—' placeholder instead.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    // Find the isRevoked conditional in the JSX
    const isRevokedIdx = src.indexOf('isRevoked');
    if (isRevokedIdx === -1) { process.stderr.write('isRevoked not found\n'); process.exit(1); }
    // The Actions cell for revoked rows must render something that is not an enabled button.
    // Implementation renders <span className=\"text-gray-400\">—</span> for revoked rows.
    if (!src.includes('text-gray-400')) {
      process.stderr.write('No gray-400 placeholder found for revoked row actions column\n');
      process.exit(1);
    }
  "
}

# ── H-04: Pending install row with null fields renders dashes ────────────────

@test "H-04-A: InstallsPageClient renders computerName with nullish coalescing to em-dash" {
  # FR-3 / AC-12: null computerName must render as '—', not empty or 'null'.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    // Look for the pattern: install.computerName ?? '—'
    if (!src.includes('computerName') ) {
      process.stderr.write('computerName not referenced in InstallsPageClient\n'); process.exit(1);
    }
    // Must use ?? '—' or equivalent null-coalescing pattern for em-dash
    const hasDash = src.includes('computerName ?? \"—\"') || src.includes(\"computerName ?? '—'\");
    if (!hasDash) {
      process.stderr.write('computerName ?? \"—\" pattern not found — null would not render as em-dash\n');
      process.exit(1);
    }
  "
}

@test "H-04-B: InstallsPageClient renders gitUserId with nullish coalescing to em-dash" {
  # FR-3 / AC-12: null gitUserId must render as '—'.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    const hasDash = src.includes('gitUserId ?? \"—\"') || src.includes(\"gitUserId ?? '—'\");
    if (!hasDash) {
      process.stderr.write('gitUserId ?? \"—\" pattern not found — null would not render as em-dash\n');
      process.exit(1);
    }
  "
}

@test "H-04-C: getStatus returns 'pending' for isActivated=false and revokedAt=null" {
  # BR-2 / FR-4: a newly generated, unactivated key must show Pending badge.
  # The !install.isActivated guard must come before return "pending", and that
  # return must exist in the function body (not merely in the return-type annotation).
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx', 'utf8');
    const fnIdx = src.indexOf('function getStatus');
    if (fnIdx === -1) { process.stderr.write('getStatus not found\n'); process.exit(1); }
    const fnBody = src.slice(fnIdx, fnIdx + 500);
    // Find the actual 'return \"pending\"' or \"return 'pending'\" statement (not the type annotation)
    const returnPendingIdx = fnBody.search(/return\s+[\"']pending[\"']/);
    if (returnPendingIdx === -1) {
      process.stderr.write('return \"pending\" statement not found in getStatus body\n'); process.exit(1);
    }
    // The !isActivated check must appear before the return 'pending' statement
    const notActivatedIdx = fnBody.indexOf('!install.isActivated');
    if (notActivatedIdx === -1) { process.stderr.write('!install.isActivated check not found\n'); process.exit(1); }
    if (notActivatedIdx > returnPendingIdx) {
      process.stderr.write('return pending appears before the !isActivated check — logic may be wrong\n');
      process.exit(1);
    }
  "
}

@test "H-04-D: computerName and gitUserId are rendered as JSX expressions (not dangerouslySetInnerHTML)" {
  # EC-10 / XSS: values must be rendered via JSX expression interpolation so React
  # auto-escapes HTML special characters. dangerouslySetInnerHTML must not be used.
  run grep "dangerouslySetInnerHTML" "$PROJECT_ROOT/app/(dashboard)/installs/InstallsPageClient.tsx"
  [ "$status" -ne 0 ]
}
