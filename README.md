# Market City

A 3D investing game: every building is a real stock, and its height follows real monthly prices as history replays. Start with $10,000 in one of four eras (dot-com bubble, financial crisis, COVID crash, AI boom), buy and sell as news breaks, and compare your result with the S&P 500.

- Next.js, React Three Fiber, Tailwind
- Prices: Yahoo Finance monthly adjusted closes (Stooq fallback), cached server-side
- Pure game engine in `src/lib/engine.ts` with tests: `npx vitest run`

Educational game, not investment advice.
