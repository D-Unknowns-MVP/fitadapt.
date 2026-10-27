<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## FitAdapt architecture rules

- User data (profile, plan, session logs) lives in browser localStorage via `src/lib/fitadapt/store.ts` — the spec's deployment design keeps profile/history on-device.
- Exercise database + TOPSIS criteria source of truth is `src/lib/fitadapt/catalog.ts`; `database/fitadapt_mysql.sql` and `public/fitadapt_mysql.sql` are generated from it with `bun scripts/build_mysql_seed.ts` — regenerate after editing the catalog so MySQL and the app stay identical.
- The app reads the catalog through `getCatalog` (server function); the MySQL database runs locally (unreachable from the hosted app), so it serves the generated seed until a reachable MySQL host is wired in there.
- Camera pose tracking runs fully on-device (MediaPipe loaded dynamically in `PoseTracker`); never upload frames.
- `src/data/pose-reference.json` is generated from the Exercise Detection Dataset by `scripts/build_pose_reference.py`; rep thresholds, ROM span, form bands and k-NN samples all come from it — don't hand-tune those numbers in code.
- UI is styled with plain CSS classes (`fa-*`) in `src/fitadapt.css` using the design tokens from `src/styles.css`; avoid Tailwind utility classes in FitAdapt screens.
- TOPSIS, adaptation rules and rep counting are pure modules covered by `src/lib/fitadapt/fitadapt.test.ts`.
