/**
 * Petit graphique en barres en SVG, sans dépendance externe : le volume de
 * données du dashboard d'un salon (quelques dizaines de points) ne justifie
 * pas une bibliothèque de graphiques.
 *
 * Chaque graphique est accompagné d'un tableau (`sr-only` mais navigable) :
 * un graphique seul n'est pas exploitable au lecteur d'écran (WCAG).
 */
export function BarChart({
  data,
  valueLabel,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  valueLabel: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`Graphique : ${valueLabel} par période`}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="w-full min-w-[3px] rounded-t-sm bg-brass/70 transition-colors group-hover:bg-brass"
              style={{ height: `${max === 0 ? 0 : (d.value / max) * 100}%` }}
            />
            <span className="absolute -top-6 hidden whitespace-nowrap rounded-sm bg-charcoal px-1.5 py-0.5 text-[10px] text-ivory group-hover:block">
              {formatValue(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <table className="sr-only">
        <caption>{valueLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label}</td>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HorizontalBars({
  data,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-stone">Aucune donnée pour le moment.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ivory">{d.label}</span>
            <span className="text-stone">{formatValue(d.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal">
            <div
              className="h-full rounded-full bg-djerba-blue"
              style={{ width: `${max === 0 ? 0 : (d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
