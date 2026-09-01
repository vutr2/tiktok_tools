import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  mmss,
  segmentAt,
  totalSeconds,
  type Beat,
} from "@/lib/timeline";

const beat = (seconds: number, text = "x"): Beat => ({
  seconds,
  voiceover: text,
  shot: "cận cảnh",
  onScreenText: text,
});

const script = {
  hook: beat(3, "Da dầu mà vẫn khô?"),
  scenes: [beat(7), beat(8), beat(7), beat(5)],
};

describe("buildTimeline", () => {
  it("cộng dồn thời lượng thành mốc bắt đầu, không dùng seconds làm mốc", () => {
    const t = buildTimeline(script);
    expect(t.map((s) => s.start)).toEqual([0, 3, 10, 18, 25]);
    expect(t.map((s) => s.end)).toEqual([3, 10, 18, 25, 30]);
  });

  it("hook đứng đầu và được đánh nhãn riêng", () => {
    const t = buildTimeline(script);
    expect(t[0].kind).toBe("hook");
    expect(t[0].label).toBe("HOOK");
    expect(t[1].label).toBe("CẢNH 1");
  });

  it("tổng lấy từ phép cộng, không tin totalSeconds của model", () => {
    expect(totalSeconds(buildTimeline(script))).toBe(30);
  });

  it("cảnh 0 giây không làm thanh chạy kẹt", () => {
    const t = buildTimeline({ hook: beat(0), scenes: [beat(0)] });
    expect(t.every((s) => s.duration > 0)).toBe(true);
    expect(totalSeconds(t)).toBeGreaterThan(0);
  });

  it("giá trị rác từ model không sinh ra NaN", () => {
    const bad = { hook: beat(NaN), scenes: [beat(-5), beat(Infinity)] };
    const t = buildTimeline(bad);
    expect(t.every((s) => Number.isFinite(s.start) && s.duration > 0)).toBe(true);
  });

  it("kịch bản không có cảnh nào vẫn ra đúng một hook", () => {
    expect(buildTimeline({ hook: beat(3), scenes: [] })).toHaveLength(1);
  });
});

describe("segmentAt", () => {
  const t = buildTimeline(script);

  it("giây 0 là hook", () => {
    expect(segmentAt(t, 0)).toBe(0);
  });

  it("đúng biên thì nhảy sang cảnh sau, không kẹt lại cảnh trước", () => {
    expect(segmentAt(t, 2.999)).toBe(0);
    expect(segmentAt(t, 3)).toBe(1);
    expect(segmentAt(t, 10)).toBe(2);
  });

  it("quá cuối thì giữ ở cảnh cuối chứ không văng ra -1", () => {
    expect(segmentAt(t, 30)).toBe(4);
    expect(segmentAt(t, 999)).toBe(4);
  });

  it("mảng rỗng trả 0, không âm", () => {
    expect(segmentAt([], 5)).toBe(0);
  });
});

describe("mmss", () => {
  it("định dạng mốc thời gian", () => {
    expect(mmss(0)).toBe("0:00");
    expect(mmss(7.9)).toBe("0:07");
    expect(mmss(30)).toBe("0:30");
  });

  it("số âm không sinh chuỗi rác", () => {
    expect(mmss(-3)).toBe("0:00");
  });
});
