# Core Safety Protocols
1.  **The 500-Line Limit:** If you must edit a file > 500 lines, you CANNOT edit directly. You must refactor/split it first [Source 442].
2.  **Supabase Kill-Switch:** You are FORBIDDEN from running `db reset`, `db push`, or `migration:run`. You may only generate SQL files [Source 1416].
3.  **No "Vibe Coding":** You must verify code against `docs/architecture.md` before implementation. If the doc is missing, generate it first [Source 766].
4.  **Test Accumulation:** Tests are never deleted. Every bug fix must include a regression test (`tests/regression/`) [Source 175].
