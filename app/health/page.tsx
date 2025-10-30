'use client';
import * as React from 'react';

export default function HealthPage() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string|undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const txt = await r.text();
        try {
          const json = JSON.parse(txt);
          if (alive) setData(json);
        } catch {
          if (alive) setErr(`Unexpected token: Response is not valid JSON: ${txt.slice(0,80)}`);
        }
      } catch (e:any) {
        if (alive) setErr(String(e?.message || e));
      }
    })();
    return () => { alive = false };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Health</h1>
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-block h-3 w-3 rounded-full ${err ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className="text-sm">{err ? `Error: ${err}` : 'OK'}</span>
      </div>
      <pre className="rounded-lg border p-4 text-sm overflow-auto">
{data ? JSON.stringify(data, null, 2) : 'null'}
      </pre>
      <div className="mt-6 text-sm text-neutral-500">
        © {new Date().getFullYear()} lil-t
      </div>
    </div>
  );
}
