/**
 * Dòng thời gian của một kịch bản 30 giây.
 *
 * Tách khỏi component vì đây là chỗ dễ sai nhất và phải test được:
 * `seconds` của mỗi cảnh là THỜI LƯỢNG, không phải mốc bắt đầu. Cộng dồn sai
 * thì thanh chạy lệch với lời thoại, và người bán quay theo sẽ hụt giây.
 *
 * Tổng thời lượng luôn lấy từ phép cộng này, KHÔNG lấy `totalSeconds` model trả
 * về — model đếm sai là chuyện thường, `auditScript` sinh ra để bắt đúng việc đó.
 */

export type Beat = {
  seconds: number;
  voiceover: string;
  shot: string;
  onScreenText: string;
};

export type ScriptShape = {
  hook: Beat;
  scenes: Beat[];
};

export type Segment = Beat & {
  kind: "hook" | "scene";
  label: string;
  start: number;
  end: number;
  duration: number;
};

/** Cảnh ngắn nhất được phép — model trả 0 thì thanh chạy sẽ kẹt vĩnh viễn. */
export const MIN_SEGMENT_SECONDS = 0.5;

export function buildTimeline(script: ScriptShape): Segment[] {
  const out: Segment[] = [];
  let t = 0;

  const push = (beat: Beat, kind: Segment["kind"], label: string) => {
    const raw = Number(beat.seconds);
    const duration = Number.isFinite(raw) && raw > 0
      ? Math.max(MIN_SEGMENT_SECONDS, raw)
      : 1;
    out.push({ ...beat, kind, label, start: t, end: t + duration, duration });
    t += duration;
  };

  push(script.hook, "hook", "HOOK");
  script.scenes.forEach((s, i) => push(s, "scene", `CẢNH ${i + 1}`));
  return out;
}

export function totalSeconds(segments: Segment[]): number {
  return segments.length ? segments[segments.length - 1].end : 0;
}

/** Cảnh đang chạy tại giây `elapsed`. Quá cuối thì giữ ở cảnh cuối. */
export function segmentAt(segments: Segment[], elapsed: number): number {
  const i = segments.findIndex((s) => elapsed < s.end);
  return i === -1 ? Math.max(0, segments.length - 1) : i;
}

export function mmss(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
