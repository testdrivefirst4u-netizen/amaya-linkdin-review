import type { MixData } from "@/lib/types";

export default function MixPanel({ mix }: { mix: MixData }) {
  const max = Math.max(30, ...mix.rows.flatMap((r) => r.values));
  return (
    <section>
      <p className="mb-5 max-w-[78ch] text-muted">{mix.intro}</p>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-line py-3 pl-[18px] pr-2.5 text-left align-bottom text-[12.5px] font-medium uppercase tracking-[0.12em] text-muted">Month</th>
              {mix.headers.map((h) => (
                <th key={h} className="border-b border-line px-2.5 py-3 text-center align-bottom text-[12.5px] font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mix.rows.map((r) => (
              <tr key={r.month} className="[&:last-child>td]:border-b-0">
                <td className="whitespace-nowrap border-b border-line py-3 pl-[18px] pr-2.5 font-serif text-[19px] font-semibold text-navy">{r.month}</td>
                {r.values.map((v, i) => {
                  const a = Math.min(v / max, 1);
                  return (
                    <td
                      key={i}
                      className={`border-b border-line px-2.5 py-3 text-center tabular-nums ${v === 0 ? "text-muted" : "text-ink"} ${a > 0.6 ? "font-semibold" : ""}`}
                      style={{ background: `rgba(173,138,78,${(a * 0.7).toFixed(2)})` }}
                    >
                      {v === 0 ? "—" : `${v}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[13px] text-muted">Darker cells carry a larger share of that month&apos;s posts.</p>
      <div className="mt-10 max-w-[78ch]">
        <h2 className="mb-4 font-serif text-[28px] font-semibold leading-tight text-navy">Why the mix shifts</h2>
        <ol className="list-decimal space-y-3 pl-5 text-body marker:text-brass">
          {mix.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
