"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { IconDownload } from "@/components/icons";

export type WhiteboardHandle = {
  /** Applies a snapshot received from the other participant for a given page. */
  applyRemoteUpdate: (pageIndex: number, dataUrl: string) => void;
};

type InteractiveWhiteboardProps = {
  /** Called after the local user completes a change (stroke, shape, clear, new page). */
  onLocalUpdate?: (pageIndex: number, dataUrl: string) => void;
};

export const InteractiveWhiteboard = forwardRef<WhiteboardHandle, InteractiveWhiteboardProps>(
  function InteractiveWhiteboard({ onLocalUpdate }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Canonical last-known content per page, regardless of whether it came
    // from a local stroke or a remote update — this is what makes switching
    // pages (and joining mid-session) show the right content.
    const pageSnapshots = useRef<Map<number, string>>(new Map());
    const applyingRemote = useRef(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#0d8d78");
    const [brushSize, setBrushSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const [tool, setTool] = useState<"pen" | "eraser" | "rectangle" | "circle" | "line" | "text">("pen");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [pages, setPages] = useState<string[]>([""]);
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);

    // Mirrors state that saveHistory needs to read synchronously — the
    // useImperativeHandle factory below only recomputes when `currentPage`
    // changes, so a plain closure read of historyIndex could go stale
    // across consecutive remote updates on the same page.
    const historyIndexRef = useRef(historyIndex);
    useEffect(() => {
      historyIndexRef.current = historyIndex;
    }, [historyIndex]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      saveHistory(canvas);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      restoreHistory(canvas, historyIndex);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyIndex]);

    function drawImageOnCanvas(canvas: HTMLCanvasElement, dataUrl: string) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    }

    function saveHistory(canvas: HTMLCanvasElement) {
      const dataUrl = canvas.toDataURL();
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndexRef.current + 1);
        return [...newHistory, dataUrl];
      });
      setHistoryIndex((prev) => prev + 1);
      pageSnapshots.current.set(currentPage, dataUrl);
      if (!applyingRemote.current) {
        onLocalUpdate?.(currentPage, dataUrl);
      }
    }

    function restoreHistory(canvas: HTMLCanvasElement, index: number) {
      if (index >= 0 && index < history.length) {
        drawImageOnCanvas(canvas, history[index]);
      }
    }

    function undo() {
      if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
      }
    }

    function redo() {
      if (historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
      }
    }

    function loadPage(index: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const snapshot = pageSnapshots.current.get(index);
      if (snapshot) {
        drawImageOnCanvas(canvas, snapshot);
        setHistory([snapshot]);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        const blank = canvas.toDataURL();
        pageSnapshots.current.set(index, blank);
        setHistory([blank]);
      }
      setHistoryIndex(0);
    }

    function addPage() {
      setPages((prev) => {
        const nextIndex = prev.length;
        setCurrentPage(nextIndex);
        loadPage(nextIndex);
        return [...prev, ""];
      });
    }

    function switchPage(index: number) {
      setCurrentPage(index);
      loadPage(index);
    }

    function deletePage() {
      if (pages.length <= 1) return;
      pageSnapshots.current.delete(currentPage);
      const newPages = pages.filter((_, i) => i !== currentPage);
      setPages(newPages);
      const newPage = Math.max(0, currentPage - 1);
      setCurrentPage(newPage);
      loadPage(newPage);
    }

    // Imperative API used by the parent to apply a snapshot broadcast by
    // the other participant — never triggers onLocalUpdate (no echo).
    useImperativeHandle(
      ref,
      () => ({
        applyRemoteUpdate(pageIndex: number, dataUrl: string) {
          pageSnapshots.current.set(pageIndex, dataUrl);
          setPages((prev) =>
            prev.length > pageIndex ? prev : [...prev, ...Array(pageIndex - prev.length + 1).fill("")],
          );
          if (pageIndex === currentPage) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            applyingRemote.current = true;
            drawImageOnCanvas(canvas, dataUrl);
            saveHistory(canvas);
            applyingRemote.current = false;
          }
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [currentPage],
    );

    const startPos = useRef<{ x: number; y: number } | null>(null);

    function getPos(e: React.MouseEvent | React.TouchEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      startPos.current = pos;

      if (tool === "text") {
        const text = prompt("Texte:");
        if (text) {
          ctx.font = `${brushSize * 4}px sans-serif`;
          ctx.fillStyle = color;
          ctx.fillText(text, pos.x, pos.y);
          saveHistory(canvas);
        }
        return;
      }

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    }

    function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);

      if (tool === "rectangle" && startPos.current) {
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        const w = pos.x - startPos.current.x;
        const h = pos.y - startPos.current.y;
        ctx.strokeRect(startPos.current.x, startPos.current.y, w, h);
      } else if (tool === "circle" && startPos.current) {
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        const radius = Math.sqrt(Math.pow(pos.x - startPos.current.x, 2) + Math.pow(pos.y - startPos.current.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.current.x, startPos.current.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === "line" && startPos.current) {
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.beginPath();
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isEraser ? "#ffffff" : color;
        ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }

    function stopDrawing() {
      if (isDrawing) {
        const canvas = canvasRef.current;
        if (canvas) saveHistory(canvas);
      }
      setIsDrawing(false);
      startPos.current = null;
    }

    function clearBoard() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      saveHistory(canvas);
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

    function handleZoom(delta: number) {
      setZoom((prev) => Math.min(3, Math.max(0.5, prev + delta)));
    }

    function toggleEraser() {
      setIsEraser((prev) => {
        const next = !prev;
        setTool(next ? "eraser" : "pen");
        return next;
      });
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
              onClick={() => {
                setTool("pen");
                setIsEraser(false);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "pen" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              ✏️ Stylet
            </button>
            <button
              type="button"
              onClick={toggleEraser}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "eraser" ? "bg-[#11233f] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              🧹 Gomme
            </button>
            <button
              type="button"
              onClick={() => setTool("rectangle")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "rectangle" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              □ Carré
            </button>
            <button
              type="button"
              onClick={() => setTool("circle")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "circle" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              ○ Cercle
            </button>
            <button
              type="button"
              onClick={() => setTool("line")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "line" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              ╱ Ligne
            </button>
            <button
              type="button"
              onClick={() => setTool("text")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tool === "text" ? "bg-[#0d8d78] text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            >
              T Texte
            </button>
          </div>

          {/* Color Palette */}
          {tool !== "eraser" && (
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-[#0d8d78] scale-110" : "opacity-80 hover:opacity-100"}`}
                />
              ))}
            </div>
          )}

          {/* Brush size & actions */}
          <div className="flex items-center gap-2">
            <select
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="2">Fin</option>
              <option value="4">Moyen</option>
              <option value="8">Épais</option>
            </select>

            <button
              type="button"
              onClick={undo}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Annuler"
            >
              ↩
            </button>
            <button
              type="button"
              onClick={redo}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Rétablir"
            >
              ↪
            </button>

            <button
              type="button"
              onClick={clearBoard}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              Effacer
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

        {/* Page tabs & zoom */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => switchPage(idx)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${idx === currentPage ? "bg-[#0d8d78] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Page {idx + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="shrink-0 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-[#0d8d78] hover:text-[#0d8d78]"
            >
              + Page
            </button>
            {pages.length > 1 && (
              <button
                type="button"
                onClick={deletePage}
                className="shrink-0 rounded-xl border border-dashed border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Supprimer
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              -
            </button>
            <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              +
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
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
      </div>
    );
  },
);
