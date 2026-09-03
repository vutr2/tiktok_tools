"use client";

/**
 * Trình phát kịch bản 9:16 — chức năng đinh của app.
 *
 * Kịch bản do model trả về là chữ. Người bán đọc chữ thì không hình dung được
 * 30 giây nó ra làm sao. Ở đây ta dựng lại đúng dòng thời gian đó trong khung
 * điện thoại dọc: ảnh studio vừa sinh làm hình nền, chữ on-screen nhảy đúng
 * giây, thanh tiến trình chia theo cảnh như story.
 *
 * Lưu ý: `seconds` của mỗi cảnh là THỜI LƯỢNG, không phải mốc bắt đầu — phải
 * cộng dồn mới ra dòng thời gian. Và tổng thời lượng lấy từ phép cộng này,
 * không lấy `totalSeconds` của model (model đếm sai thì thanh chạy sẽ lệch).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildTimeline,
  mmss,
  segmentAt,
  totalSeconds,
  type Beat,
  type Segment,
} from "@/lib/timeline";

export type { Beat };

export type PlayerScript = {
  angle: string;
  objectionHandled: string;
  hook: Beat;
  scenes: Beat[];
  cta: string;
  totalSeconds: number;
  warnings: string[];
};

export default function ScriptPlayer({
  scripts,
  photos,
  productName,
}: {
  scripts: PlayerScript[];
  photos: string[];
  productName: string;
}) {
  const [pick, setPick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);

  const script = scripts[pick];
  const elapsedRef = useRef(0);

  const segments = useMemo<Segment[]>(
    () => (script ? buildTimeline(script) : []),
    [script],
  );

  const total = totalSeconds(segments);
  const active = useMemo(() => segmentAt(segments, elapsed), [segments, elapsed]);

  const seek = useCallback((t: number) => {
    elapsedRef.current = t;
    setElapsed(t);
  }, []);

  // Đổi kịch bản thì tua về đầu và dừng.
  useEffect(() => {
    seek(0);
    setPlaying(false);
  }, [pick, seek]);

  useEffect(() => {
    if (!playing || total === 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(elapsedRef.current + dt, total);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  const toggle = useCallback(() => {
    if (!playing && elapsedRef.current >= total) seek(0);
    setPlaying((p) => !p);
  }, [playing, total, seek]);

  const jump = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(0, active + delta), segments.length - 1);
      seek(segments[next]?.start ?? 0);
    },
    [active, segments, seek],
  );

  if (!script || segments.length === 0) return null;

  const seg = segments[active];
  const photo = photos.length ? photos[active % photos.length] : null;
  // CTA hiện ở đoạn cuối, như sticker chốt đơn trên TikTok.
  const showCta = elapsed >= total - Math.min(6, total * 0.25);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">← Trở lại kịch bản</span>
        {/* Nhãn nói đúng việc nó làm. App chưa có chỗ lưu kịch bản (đúng 6 bảng),
            nên không đặt nút "Lưu" rồi chẳng lưu gì. */}
        <button
          onClick={() => navigator.clipboard?.writeText(asText(script, segments))}
          className="shrink-0 text-sm font-medium text-neon transition hover:opacity-80"
        >
          Chép kịch bản
        </button>
      </div>

      {/* Chọn 1 trong 5 kịch bản */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {scripts.map((s, i) => (
          <button
            key={i}
            onClick={() => setPick(i)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
              i === pick
                ? "border-brand bg-brand text-white shadow-lg shadow-brand/25"
                : "border-line bg-raise text-muted hover:border-dim"
            }`}
          >
            <span className="opacity-60">{i + 1}</span>{" "}
            <span className="ml-1">{s.angle}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
        {/* ── Khung điện thoại ── */}
        <div className="mx-auto w-full max-w-[300px]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border border-line bg-black shadow-2xl shadow-black/60">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${pick}-${active}`}
                src={photo}
                alt=""
                className="absolute inset-0 h-full w-full animate-kenburns object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand/25 via-canvas to-neon/15" />
            )}

            {/* Lớp phủ để chữ luôn đọc được, kể cả ảnh sáng trắng */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/85" />

            {/* Thanh tiến trình chia theo cảnh, kiểu story */}
            <div className="absolute inset-x-3 top-3 z-30 flex gap-1">
              {segments.map((s, i) => {
                const pct =
                  elapsed <= s.start
                    ? 0
                    : elapsed >= s.end
                      ? 100
                      : ((elapsed - s.start) / s.duration) * 100;
                return (
                  <button
                    key={i}
                    onClick={() => seek(s.start)}
                    title={s.label}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
                  >
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${pct}%` }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Nhãn cảnh + đồng hồ */}
            <div className="absolute inset-x-4 top-7 z-30 flex items-center justify-between pt-2 text-[11px] font-semibold">
              <span
                className={`rounded-full px-2 py-1 caption-shadow ${
                  seg.kind === "hook"
                    ? "bg-brand text-white"
                    : "bg-white/15 text-white"
                }`}
              >
                {seg.label} · {seg.duration}s
              </span>
              <span className="text-white/80 caption-shadow">
                {mmss(elapsed)} / {mmss(total)}
              </span>
            </div>

            {/* Vùng chạm: trái lùi cảnh, phải tiến cảnh, giữa play/pause */}
            <div className="absolute inset-0 z-20 flex">
              <button
                aria-label="Cảnh trước"
                onClick={() => jump(-1)}
                className="h-full w-1/4"
              />
              <button
                aria-label={playing ? "Tạm dừng" : "Phát"}
                onClick={toggle}
                className="h-full flex-1"
              />
              <button
                aria-label="Cảnh sau"
                onClick={() => jump(1)}
                className="h-full w-1/4"
              />
            </div>

            {/* Chữ on-screen — thứ người xem thật sự nhìn thấy trên video */}
            <div className="pointer-events-none absolute inset-x-5 top-1/2 z-30 -translate-y-1/2 text-center">
              <p
                key={`t-${pick}-${active}`}
                className="animate-rise text-2xl font-extrabold leading-tight text-white caption-shadow"
              >
                {seg.onScreenText}
              </p>
            </div>

            {!playing ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                  <span className="ml-1 text-2xl text-white">▶</span>
                </div>
              </div>
            ) : null}

            {/* Lời thoại + gợi ý cảnh quay, ở dưới như phụ đề */}
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30">
              {showCta ? (
                <div className="mb-2 inline-block animate-rise rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white">
                  👉 {script.cta}
                </div>
              ) : null}
              <p
                key={`v-${pick}-${active}`}
                className="animate-rise text-sm font-medium text-white caption-shadow"
              >
                “{seg.voiceover}”
              </p>
              <p className="mt-1 text-[11px] text-white/70 caption-shadow">
                🎬 {seg.shot}
              </p>
            </div>
          </div>

          {/* Điều khiển */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => jump(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raise text-ink transition active:scale-95"
              aria-label="Cảnh trước"
            >
              ⏮
            </button>
            <button
              onClick={toggle}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-brand to-[#ff5b7f] text-lg text-white shadow-lg shadow-brand/30 transition active:scale-95"
              aria-label={playing ? "Tạm dừng" : "Phát"}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => {
                seek(0);
                setPlaying(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raise text-ink transition active:scale-95"
              aria-label="Phát lại từ đầu"
            >
              ↻
            </button>
          </div>

          {photos.length === 0 ? (
            <p className="mt-3 text-center text-xs text-dim">
              Dựng ảnh studio trước để xem kịch bản chạy trên ảnh thật của bạn.
            </p>
          ) : null}
        </div>

        {/* ── Dòng thời gian bên cạnh ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{script.angle}</span>
            <span className="rounded-full bg-raise px-2.5 py-0.5 text-xs text-muted">
              đập lại: {script.objectionHandled}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                Math.abs(total - 30) <= 2
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {total.toFixed(0)}s
            </span>
          </div>

          <h3 className="mt-5 text-base font-bold">Dòng thời gian kịch bản</h3>
          <ol className="mt-3 space-y-2">
            {segments.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => seek(s.start)}
                  className={`block w-full rounded-xl border p-3.5 text-left transition ${
                    i === active
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-panel hover:border-dim"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold tracking-wide ${
                          s.kind === "hook" ? "text-brand" : "text-muted"
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="text-[11px] text-dim">• {s.duration}s</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-dim">
                      {mmss(s.start)}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-sm leading-snug text-ink">
                    Dialogue: &ldquo;{s.voiceover}&rdquo;
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-dim">
                    Note: {s.shot}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-3 rounded-xl border border-neon/40 bg-neon/5 p-3.5 text-sm font-medium text-neon">
            📌 {script.cta}
          </div>

          {script.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1.5 rounded-xl border border-brand/40 bg-brand/5 p-3.5 text-xs leading-snug text-muted">
              {script.warnings.map((w, k) => (
                <li key={k}>
                  <span className="font-semibold text-brand">🚨 {w}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-xs text-dim">
            Quay {productName} theo đúng thứ tự trên. Thanh chạy là thời lượng
            thật — cảnh nào đọc không kịp thì cảnh báo ở trên đã nói.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Chép ra dạng chữ để dán vào ghi chú khi đi quay. */
function asText(script: PlayerScript, segments: Segment[]): string {
  const lines = segments.map(
    (s) =>
      `[${mmss(s.start)}] ${s.label} (${s.duration}s)\n` +
      `  Lời: ${s.voiceover}\n  Chữ: ${s.onScreenText}\n  Cảnh: ${s.shot}`,
  );
  return `${script.angle}\nĐập lại phản đối: ${script.objectionHandled}\n\n${lines.join("\n\n")}\n\nCTA: ${script.cta}`;
}
