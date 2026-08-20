"use client";

import { useEffect, useRef, useState } from "react";
import { IconDownload } from "@/components/icons";

export function InteractiveWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#0d8d78");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function exportCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tableau-profyspace-${Date.now()}.png`;
    a.click();
  }

  const colors = ["#11233f", "#0d8d78", "#2563eb", "#dc2626", "#d97706", "#7c3aed"];

  return (
    <div className="relative flex flex-col w-full h-full min-h-[420px] bg-white rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
      {/* Whiteboard Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Outils :</span>
          <button
            type="button"
            onClick={() => setIsEraser(false)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${!isEraser ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
          >
            ✏️ Stylet
          </button>
          <button
            type="button"
            onClick={() => setIsEraser(true)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${isEraser ? "bg-[#11233f] text-white" : "bg-white border border-slate-200 text-slate-700"
              }`}
          >
            🧹 Gomme
          </button>
        </div>

        {/* Color Palette */}
        {!isEraser && (
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-6 w-6 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-[#0d8d78] scale-110" : "opacity-80 hover:opacity-100"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Brush size & clear */}
        <div className="flex items-center gap-2">
          <select
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="2">Fin (2px)</option>
            <option value="4">Moyen (4px)</option>
            <option value="8">Épais (8px)</option>
          </select>

          <button
            type="button"
            onClick={clearBoard}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            Effacer tout
          </button>

          <button
            type="button"
            onClick={exportCanvas}
            title="Télécharger le tableau"
            className="flex items-center gap-1 rounded-xl bg-[#0d8d78] px-3 py-1 text-xs font-bold text-white shadow-xs"
          >
            <IconDownload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full flex-1 cursor-crosshair touch-none"
      />
    </div>
  );
}
