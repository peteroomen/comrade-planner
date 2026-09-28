import { useStore } from './context';

export function Star({ size = 40 }: { size?: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 1 : 0.42;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    return `${(50 + 46 * r * Math.cos(a)).toFixed(1)},${(50 + 46 * r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <polygon points={pts} fill="var(--red)" stroke="var(--ink)" strokeWidth="2.5" />
    </svg>
  );
}

export function Title() {
  const store = useStore();
  return (
    <main className="title screen">
      <div className="title-inner">
        <Star size={64} />
        <h1>Comrade Planner</h1>
        <p className="title-sub">Everyone lies to you.</p>
        <ol className="title-steps">
          <li>
            <b>Plan</b> the quarter on the map: quotas, wages, prices, and where to post two
            observers.
          </li>
          <li>
            <b>Watch</b> the trains run. Answer the petitions and tips that interrupt you.
          </li>
          <li>
            <b>Judge</b> the managers&rsquo; reports at the desk against the railway&rsquo;s own
            records.
          </li>
        </ol>
        <p className="title-rule">
          Four bars, and both ends of every bar are fatal. Keep the People fed, the Apparatus
          content, the Centre pleased and the Shadow economy small. Or at least, alive.
        </p>
        <button
          type="button"
          className="btn btn-red btn-big"
          onClick={() => store.dispatch({ type: 'start' })}
        >
          Take up your post
        </button>
      </div>
    </main>
  );
}
