# Scenario: P-09 — README security note acknowledges curl-pipe-bash and links to raw script

## Type
feature

## Priority
medium — curl-pipe-bash is a legitimate security concern; acknowledging it and providing the review URL is standard practice for developer tools using this install pattern

## Preconditions
- `README.md` has been updated per the spec

## Action
Read the install section of `README.md`.

## Expected Outcome
- A security note or callout exists near the install command
- The note acknowledges that the install command pipes curl output to bash
- The note provides a direct URL to the raw install script for manual review before running:
  `https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh`
- The note does NOT discourage use of the one-liner — it simply gives security-conscious users an alternative review path

## Failure Mode
N/A

## Notes
The security note can be a blockquote, a small paragraph, or a note callout — format is flexible. The raw URL must be present and correct.
