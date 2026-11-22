import type { LearnLink } from "@/lib/learn";

/** "Learn what happened" reading list, opening in a new tab. */
export function LearnLinks({ links, heading = "Learn what really happened" }: { links: LearnLink[]; heading?: string }) {
  if (links.length === 0) return null;
  return (
    <section className="mt-6">
      <h3 className="text-sm font-bold text-glow">{heading}</h3>
      <ul className="mt-2 divide-y divide-edge overflow-hidden rounded-xl border border-edge">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-white/5">
              <span className="font-semibold text-text">{l.title}</span>
              <span className="shrink-0 text-xs text-sub">
                {l.source} <span aria-hidden>↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
