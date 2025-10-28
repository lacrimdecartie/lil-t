"use client";
import React from "react";

const PRESET = ["#EAB308","#F59E0B","#F97316","#EF4444","#22C55E","#10B981","#06B6D4","#3B82F6","#8B5CF6","#EC4899","#6B7280","#F3F4F6"];

export default function ColorSwatch({ onPick }: { onPick: (c:string)=>void }) {
  return (
    <div className="grid grid-cols-6 gap-2 p-2">
      {PRESET.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => onPick(c)}
          className="h-6 w-6 rounded-full border"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
