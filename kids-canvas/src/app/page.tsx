"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import styles from "./page.module.css";

type Tool = "pen" | "eraser" | "text";

type Point = {
  x: number;
  y: number;
};

const pastelPalette = [
  "#FF9AA2",
  "#FFB7B2",
  "#FFDAC1",
  "#E2F0CB",
  "#B5EAD7",
  "#C7CEEA",
  "#F4B6C2",
  "#D4A5A5",
];

const brushOptions = [6, 12, 20, 32];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(pastelPalette[0]);
  const [brushSize, setBrushSize] = useState<number>(brushOptions[1]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textPosition, setTextPosition] = useState<Point>({ x: 0, y: 0 });
  const hasInitialized = useRef(false);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    return canvas.getContext("2d");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const prevData =
        hasInitialized.current && canvas.width > 0 && canvas.height > 0
          ? canvas.toDataURL()
          : null;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (prevData) {
        const img = new Image();
        img.onload = () => {
          const newCtx = canvas.getContext("2d");
          if (!newCtx) return;
          newCtx.setTransform(1, 0, 0, 1, 0, 0);
          newCtx.scale(dpr, dpr);
          newCtx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = prevData;
      }

      hasInitialized.current = true;
    };

    resizeCanvas();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resizeCanvas);
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const strokeColor = useMemo(
    () => (tool === "eraser" ? "#ffffff" : color),
    [tool, color]
  );

  const drawSegment = useCallback(
    (from: Point, to: Point) => {
      const ctx = getContext();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    },
    [brushSize, strokeColor, getContext]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (tool === "text") {
        setTextPosition({ x, y });
        setTextValue("");
        setShowTextInput(true);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        return;
      }

      drawing.current = true;
      lastPoint.current = { x, y };
      canvas.setPointerCapture(event.pointerId);
      drawSegment({ x, y }, { x, y });
    },
    [tool, drawSegment]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || tool === "text") return;
      const canvas = canvasRef.current;
      if (!canvas || !lastPoint.current) return;
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nextPoint = { x, y };
      drawSegment(lastPoint.current, nextPoint);
      lastPoint.current = nextPoint;
    },
    [drawSegment, tool]
  );

  const stopDrawing = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
  }, []);

  const handleTextCommit = useCallback(() => {
    if (!textValue.trim()) {
      setShowTextInput(false);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const fontSize = Math.round(brushSize * 2.2 + 14);
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = Math.max(1, brushSize / 3);
    ctx.font = `700 ${fontSize}px "Comic Sans MS", "Comic Neue", "Poppins", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(textValue.trim(), textPosition.x, textPosition.y);
    ctx.strokeText(textValue.trim(), textPosition.x, textPosition.y);
    ctx.restore();

    setShowTextInput(false);
    setTextValue("");
  }, [brushSize, color, getContext, textPosition, textValue]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `my-creative-canvas.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    confetti({
      particleCount: 160,
      spread: 70,
      gravity: 0.6,
      origin: { y: 0.3 },
      colors: pastelPalette,
    });
  }, []);

  const handleClear = useCallback(() => {
    setShowTextInput(false);
    setTextValue("");
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [getContext]);

  useEffect(() => {
    if (!showTextInput) return;
    inputRef.current?.focus();
  }, [showTextInput]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.sparkle}>✨</span>
          <h1 className={styles.title}>🎨 My Creative Canvas</h1>
          <span className={styles.sparkle}>🌈</span>
        </div>
        <p className={styles.subtitle}>
          Pick a color, draw a masterpiece, and let your imagination shine!
        </p>
      </header>

      <div className={styles.canvasArea} ref={containerRef}>
        <canvas
          ref={canvasRef}
          className={styles.drawingCanvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarSection}>
            <button
              type="button"
              className={`${styles.toolButton} ${
                tool === "pen" ? styles.active : ""
              }`}
              onClick={() => setTool("pen")}
              aria-pressed={tool === "pen"}
            >
              🖍️ Pen
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${
                tool === "eraser" ? styles.active : ""
              }`}
              onClick={() => setTool("eraser")}
              aria-pressed={tool === "eraser"}
            >
              🩹 Eraser
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${
                tool === "text" ? styles.active : ""
              }`}
              onClick={() => setTool("text")}
              aria-pressed={tool === "text"}
            >
              🔤 Text
            </button>
          </div>

          <div className={styles.toolbarSection}>
            {pastelPalette.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`${styles.colorSwatch} ${
                  color === swatch && tool !== "eraser" ? styles.active : ""
                }`}
                style={{ backgroundColor: swatch }}
                onClick={() => {
                  setColor(swatch);
                  setTool("pen");
                }}
                aria-label={`Select color ${swatch}`}
              />
            ))}
          </div>

          <div className={styles.toolbarSection}>
            {brushOptions.map((size) => (
              <button
                key={size}
                type="button"
                className={`${styles.brushButton} ${
                  brushSize === size ? styles.active : ""
                }`}
                onClick={() => setBrushSize(size)}
                aria-label={`Brush size ${size}`}
              >
                <span
                  className={styles.brushPreview}
                  style={{
                    width: Math.max(8, size * 0.6),
                    height: Math.max(8, size * 0.6),
                  }}
                ></span>
              </button>
            ))}
          </div>
        </div>

        {showTextInput && (
          <input
            ref={inputRef}
            className={styles.textInput}
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            onBlur={handleTextCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleTextCommit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setShowTextInput(false);
              }
            }}
            style={{
              left: `${textPosition.x}px`,
              top: `${textPosition.y}px`,
              color,
            }}
            maxLength={18}
            placeholder="Type here!"
          />
        )}
      </div>

      <div className={styles.bottomBar}>
        <button type="button" className={styles.secondaryAction} onClick={handleClear}>
          ♻️ Start Fresh
        </button>
        <button type="button" className={styles.primaryAction} onClick={handleSave}>
          💾 Save My Art
        </button>
      </div>
    </div>
  );
}
