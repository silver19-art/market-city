import "server-only";
import { buildPuzzle, pickPuzzle } from "./daily";
import { loadEra } from "./load-era";

/** The day's puzzle and answer key, built from the cached era data. */
export async function puzzleFor(day: string) {
  const pick = pickPuzzle(day);
  const era = await loadEra(pick.eraId);
  return buildPuzzle(day, era);
}
