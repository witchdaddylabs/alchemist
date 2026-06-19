# Drive Duplicate Audit

This project now includes a small, report-only scanner for duplicate cleanup planning.

It does **not** delete, move, or rename anything.

## What it checks

- Exact duplicate files by content hash
- Same-name collisions
- Duplicate folder trees by structure and file content
- Archive-vs-folder matches for extracted archives

## How to run

```bash
npm run audit:duplicates -- --root "/path/to/a local drive mirror"
```

Optional output folder:

```bash
npm run audit:duplicates -- --root "/path/to/a local drive mirror" --out-dir "./audit-output"
```

## What you get

- `report.json` for machine reading
- `summary.md` for a human-readable list of likely duplicates

## Notes

- This is safest when pointed at a local Drive mirror or exported folder tree.
- Archives are compared against folder trees without changing anything on disk.
- The first pass is intentionally conservative: it reports candidates instead of making cleanup decisions.
