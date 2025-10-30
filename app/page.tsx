'use client'
import nextDynamic from "next/dynamic";

const Editor = nextDynamic(() => import("@/components/Editor"), { ssr: false });

export default function Page() {
  return (
    <main>
      <Editor />
    </main>
  );
}

export const dynamic = 'force-dynamic';
