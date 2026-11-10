"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Minus, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const W = 200,
  H = 200,
  CELL = 4;
const PALETTE = [
  { name: "White", hex: "#ffffff" },
  { name: "Light gray", hex: "#e4e4e4" },
  { name: "Gray", hex: "#888888" },
  { name: "Black", hex: "#222222" },
  { name: "Pink", hex: "#ffa7d1" },
  { name: "Red", hex: "#e50000" },
  { name: "Orange", hex: "#e59500" },
  { name: "Brown", hex: "#a06a42" },
  { name: "Yellow", hex: "#e5d900" },
  { name: "Lime", hex: "#94e044" },
  { name: "Green", hex: "#02be01" },
  { name: "Cyan", hex: "#00d3dd" },
  { name: "Blue", hex: "#0083c7" },
  { name: "Dark blue", hex: "#0000ea" },
  { name: "Violet", hex: "#cf6ee4" },
  { name: "Purple", hex: "#820080" },
];
const PALETTE_RGB = PALETTE.map(({ hex }) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
);

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const grid = useRef(new Uint8Array(W * H));
  const drag = useRef({ down: false, moved: 0, lastX: 0, lastY: 0 });
  const { resolvedTheme, setTheme } = useTheme();

  const [color, setColor] = useState(5);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

  function render() {
    const ctx = canvasRef.current!.getContext("2d")!;
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < grid.current.length; i++) {
      const [r, g, b] = PALETTE_RGB[grid.current[i]];
      img.data.set([r, g, b, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }

  function place(x: number, y: number) {
    grid.current[y * W + x] = color;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = PALETTE[color].hex;
    ctx.fillRect(x, y, 1, 1);
  }

  function toCell(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * W);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * H);
    return x >= 0 && x < W && y >= 0 && y < H ? { x, y } : null;
  }

  // zoom keeping the point (cx, cy) fixed on screen
  function zoomAt(cx: number, cy: number, factor: number) {
    setView((v) => {
      const scale = Math.min(20, Math.max(0.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }

  function zoomCenter(factor: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  function fitView() {
    const rect = viewportRef.current!.getBoundingClientRect();
    const scale = (Math.min(rect.width, rect.height) / (W * CELL)) * 0.85;
    setView({
      scale,
      x: (rect.width - W * CELL * scale) / 2,
      y: (rect.height - H * CELL * scale) / 2,
    });
  }

  useEffect(() => {
    render();
    fitView();
  }, []);

  useEffect(() => {
    const el = viewportRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        e.deltaY < 0 ? 1.1 : 1 / 1.1,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { down: true, moved: 0, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    setHover(toCell(e));
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.lastX,
      dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved >= 5) setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasClick = drag.current.moved < 5;
    drag.current.down = false;
    if (wasClick) {
      const cell = toCell(e);
      if (cell) place(cell.x, cell.y);
    }
  }

  return (
    <TooltipProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        {/* board */}
        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-crosshair touch-none bg-muted"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHover(null)}
        >
          <div
            className="relative shadow-2xl ring-1 ring-border"
            style={{
              width: W * CELL,
              height: H * CELL,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              style={{
                width: W * CELL,
                height: H * CELL,
                imageRendering: "pixelated",
                display: "block",
              }}
            />
            {hover && (
              <div
                className="pointer-events-none absolute opacity-70 outline outline-1 outline-foreground"
                style={{
                  left: hover.x * CELL,
                  top: hover.y * CELL,
                  width: CELL,
                  height: CELL,
                  background: PALETTE[color].hex,
                }}
              />
            )}
          </div>
        </div>

        {/* header */}
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div className="pointer-events-auto flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              Pixel Canvas
            </h1>
            <Badge variant="secondary" className="font-mono">
              {hover ? `${hover.x}, ${hover.y}` : "—, —"}
            </Badge>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
            <Button variant="outline" size="sm" disabled>
              Sign in
            </Button>
          </div>
        </header>

        {/* zoom controls */}
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            onClick={() => zoomCenter(1.5)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            onClick={() => zoomCenter(1 / 1.5)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Fit to screen"
            onClick={fitView}
          >
            <Maximize className="size-4" />
          </Button>
        </div>

        {/* palette */}
        <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-1.5 rounded-xl border bg-card/80 p-2 shadow-lg backdrop-blur">
          {PALETTE.map((c, i) => (
            <Tooltip key={c.hex}>
              <TooltipTrigger
                onClick={() => setColor(i)}
                aria-label={c.name}
                className={cn(
                  "size-8 rounded-md border transition-transform",
                  i === color
                    ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                    : "hover:scale-105",
                )}
                style={{ background: c.hex }}
              />
              <TooltipContent side="top">{c.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
