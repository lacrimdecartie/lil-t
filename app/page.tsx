import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

export default function Page() {
  return (
    <main>
      <header className="h-14 flex items-center justify-between px-4 border-b">
        <h1 className="text-lg font-semibold">lil-T</h1>
        <a className="text-sm opacity-80" href="/api/health">Health</a>
      </header>
      <Editor />
    </main>
  );
}
