"use client";

import { useState } from "react";
import { Badge, buttonClass, buttonGhostClass, Card, Shimmer } from "@/components/ui";
import ScriptPlayer, { type PlayerScript } from "@/components/script-player";

type Scene = { id: string; name: string; emoji: string; useCase: string };

type Tab = "photos" | "listing" | "scripts";

type Issue = { level: "error" | "warn"; code: string; message: string };

type PhotoResult = {
  sceneId: string;
  sceneName: string;
  ok: boolean;
  url?: string;
  error?: string;
};

type Listing = {
  shopeeTitle: string;
  tiktokTitle: string;
  description: string;
  bulletPoints: string[];
  shopeeHashtags: string[];
  tiktokHashtags: string[];
  keywords: string[];
  issues: {
    shopeeTitle: Issue[];
    tiktokTitle: Issue[];
    description: Issue[];
    claims: { matched: string; why: string; fix: string }[];
  };
};

const TABS: [Tab, string, string][] = [
  ["photos", "✨", "Ảnh studio"],
  ["listing", "📝", "Mô tả sàn"],
  ["scripts", "🎬", "Kịch bản"],
];

export default function Workbench({
  productId,
  productName,
  originalUrl,
  scenes,
  cost,
  balance: initialBalance,
}: {
  productId: string;
  productName: string;
  originalUrl: string;
  scenes: Scene[];
  cost: {
    PRODUCT_PHOTO_PER_SCENE: number;
    LISTING_COPY: number;
    VIDEO_SCRIPT: number;
  };
  balance: number;
}) {
  const [tab, setTab] = useState<Tab>("photos");
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [picked, setPicked] = useState<string[]>(scenes.map((s) => s.id));
  const [photos, setPhotos] = useState<PhotoResult[] | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [scripts, setScripts] = useState<PlayerScript[] | null>(null);

  // Ảnh đã dựng xong sẽ thành hình nền cho trình phát kịch bản — hai chức năng
  // nối vào nhau, đây là chỗ app khác hẳn một khung chat.
  const readyPhotos = (photos ?? [])
    .filter((p) => p.ok && p.url)
    .map((p) => p.url as string);

  async function call(kind: Tab, path: string, body?: unknown) {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Có lỗi xảy ra");
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const photoCost = picked.length * cost.PRODUCT_PHOTO_PER_SCENE;

  return (
    <div className="mt-6">
      {/* Tab dạng viên: tab đang mở tô gradient, đủ tương phản để thấy ngay */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-panel p-1.5">
        {TABS.map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-semibold transition ${
              tab === key
                ? "bg-gradient-to-r from-brand to-[#ff5b7f] text-white shadow-lg shadow-brand/25"
                : "text-muted hover:text-ink"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {/* ─────────────── Ảnh studio ─────────────── */}
      {tab === "photos" ? (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Chọn bối cảnh</h2>
            <span className="text-xs text-muted">
              {cost.PRODUCT_PHOTO_PER_SCENE} credit / ảnh · còn {balance}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {scenes.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setPicked((prev) =>
                      on ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                    )
                  }
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    on
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-panel hover:border-dim"
                  }`}
                >
                  <span className="flex items-start justify-between">
                    <span className="text-xl leading-none">{s.emoji}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                        on
                          ? "border-brand bg-brand text-white"
                          : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </span>
                  <span className="mt-2.5 block text-sm font-bold">{s.name}</span>
                  <span className="mt-1 block text-xs leading-snug text-dim">
                    {s.useCase}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            disabled={busy !== null || picked.length === 0}
            onClick={async () => {
              const res = await call("photos", "photos", { sceneIds: picked });
              if (res) {
                setPhotos(res.results);
                setBalance(res.balance);
              }
            }}
            className={`${buttonClass} mt-4 w-full py-3.5`}
          >
            {busy === "photos"
              ? "Đang dựng ảnh... (khoảng 15 giây)"
              : `✨ Dựng ${picked.length} ảnh · ${photoCost} credit`}
          </button>

          {busy === "photos" ? (
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                {scenes
                  .filter((s) => picked.includes(s.id))
                  .map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted"
                    >
                      {s.emoji} {s.name}
                    </span>
                  ))}
              </div>
              <p className="mt-4 text-sm font-medium text-neon">
                ⏳ Đang dựng ảnh... (khoảng 15 giây)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {picked.map((id) => (
                  <div key={id}>
                    <Shimmer className="aspect-square w-full rounded-2xl" />
                    <Shimmer className="mt-2 h-2.5 w-2/5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {photos ? (
            <div className="mt-7">
              <h3 className="text-base font-bold">Trước &amp; sau</h3>

              {/* Ảnh gốc để rộng hết khổ: đây là vế "trước", phải thấy rõ mới
                  cảm được mức chênh lệch với ảnh studio bên dưới. */}
              <figure className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalUrl}
                  alt="Ảnh bạn chụp"
                  className="aspect-[16/9] w-full rounded-2xl object-cover"
                />
                <figcaption className="mt-2 text-xs text-muted">
                  📸 Ảnh bạn chụp (gốc)
                </figcaption>
              </figure>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {photos.map((p) => (
                  <figure key={p.sceneId}>
                    {p.ok && p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.sceneName}
                        className="aspect-square w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-raise p-4 text-center text-xs text-red-300">
                        {p.error}
                      </div>
                    )}
                    <figcaption className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs">{p.sceneName}</span>
                      {p.ok ? (
                        <a
                          href={p.url}
                          download
                          className="shrink-0 text-xs font-medium text-neon"
                        >
                          Tải
                        </a>
                      ) : (
                        <Badge tone="error">Đã hoàn credit</Badge>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>

              {readyPhotos.length > 0 ? (
                <button
                  onClick={() => setTab("scripts")}
                  className={`${buttonGhostClass} mt-5 w-full py-3.5`}
                >
                  🎬 Xem kịch bản chạy trên ảnh này →
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ─────────────── Mô tả sàn ─────────────── */}
      {tab === "listing" ? (
        <section className="mt-6">
          <button
            disabled={busy !== null}
            onClick={async () => {
              const res = await call("listing", "listing");
              if (res) {
                setListing(res.output);
                setBalance(res.balance);
              }
            }}
            className={`${buttonClass} w-full py-3.5`}
          >
            {busy === "listing"
              ? "Đang viết..."
              : `📝 Viết mô tả · ${cost.LISTING_COPY} credit`}
          </button>

          {busy === "listing" ? (
            <div className="mt-6 space-y-3">
              <Shimmer className="h-20 w-full" />
              <Shimmer className="h-32 w-full" />
            </div>
          ) : null}

          {listing ? (
            <div className="mt-6 space-y-4">
              <TitleCard
                label="Tiêu đề Shopee"
                value={listing.shopeeTitle}
                limit={120}
                issues={listing.issues.shopeeTitle}
              />
              <TitleCard
                label="Tiêu đề TikTok Shop"
                value={listing.tiktokTitle}
                limit={255}
                issues={listing.issues.tiktokTitle}
              />

              <Card>
                <Header label="Mô tả" text={listing.description} />
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink">
                  {listing.description}
                </pre>
                {listing.bulletPoints.length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 text-sm text-ink">
                    {listing.bulletPoints.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card>
                <Header
                  label="Hashtags gợi ý"
                  text={`Shopee: ${listing.shopeeHashtags.join(" ")}\nTikTok Shop: ${listing.tiktokHashtags.join(" ")}`}
                />
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-dim">Shopee:</div>
                    <p className="mt-1 leading-relaxed text-neon">
                      {listing.shopeeHashtags.join(" ")}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs text-dim">TikTok Shop:</div>
                    <p className="mt-1 leading-relaxed text-neon">
                      {listing.tiktokHashtags.join(" ")}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-dim">
                  Từ khoá chạy quảng cáo: {listing.keywords.join(", ")}
                </p>
              </Card>

              {listing.issues.claims.length > 0 ? (
                <Card className="border-brand/40 bg-brand/5">
                  <div className="text-sm font-bold text-brand">
                    ⚠ Cụm từ có rủi ro bị gỡ listing
                  </div>
                  <ul className="mt-2 space-y-2.5 text-sm leading-snug">
                    {listing.issues.claims.map((c, i) => (
                      <li key={i}>
                        <span className="text-muted">
                          Từ <b className="text-ink">&ldquo;{c.matched}&rdquo;</b>{" "}
                          {c.why}
                        </span>
                        <div className="mt-1 font-medium text-brand">
                          → Đề xuất: {c.fix}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ─────────────── Kịch bản ─────────────── */}
      {tab === "scripts" ? (
        <section className="mt-6">
          <button
            disabled={busy !== null}
            onClick={async () => {
              const res = await call("scripts", "scripts");
              if (res) {
                setScripts(res.output.scripts);
                setBalance(res.balance);
              }
            }}
            className={`${buttonClass} w-full py-3.5`}
          >
            {busy === "scripts"
              ? "Đang viết kịch bản..."
              : `🎬 Viết 5 kịch bản · ${cost.VIDEO_SCRIPT} credit`}
          </button>

          {busy === "scripts" ? (
            <div className="mt-6 flex justify-center">
              <Shimmer className="aspect-[9/16] w-full max-w-[300px] rounded-[2rem]" />
            </div>
          ) : null}

          {scripts ? (
            <ScriptPlayer
              scripts={scripts}
              photos={readyPhotos}
              productName={productName}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Header({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
        {label}
      </span>
      <button
        onClick={() => navigator.clipboard?.writeText(text)}
        className="shrink-0 text-xs font-medium text-neon transition hover:opacity-80"
      >
        Chép
      </button>
    </div>
  );
}

function TitleCard({
  label,
  value,
  limit,
  issues,
}: {
  label: string;
  value: string;
  limit: number;
  issues: Issue[];
}) {
  const over = value.length > limit;
  return (
    <Card>
      <Header label={label} text={value} />
      <p className="mt-2 text-[15px] leading-snug text-ink">{value}</p>
      <hr className="mt-3 border-line" />
      <p className={`mt-2 text-xs ${over ? "text-red-400" : "text-dim"}`}>
        {value.length}/{limit} ký tự
      </p>
      {issues.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {issues.map((i, k) => (
            <li
              key={k}
              className={i.level === "error" ? "text-red-400" : "text-amber-300"}
            >
              {i.message}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
