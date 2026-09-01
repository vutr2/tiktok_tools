"use client";

import { useState } from "react";
import { Badge, buttonClass, buttonGhostClass, Card, Shimmer } from "@/components/ui";
import ScriptPlayer, { type PlayerScript } from "@/components/script-player";

type Scene = { id: string; name: string; useCase: string };

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
      {/* Tab kiểu app, không phải kiểu tài liệu */}
      <div className="flex items-center gap-1 rounded-2xl border border-line bg-panel p-1">
        {TABS.map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "bg-raise text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
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
                  className={`flex gap-3 rounded-2xl border p-4 text-left transition ${
                    on
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-panel hover:border-dim"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${
                      on
                        ? "border-brand bg-brand text-white"
                        : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{s.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {s.useCase}
                    </span>
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
            className={`${buttonClass} mt-5 w-full sm:w-auto`}
          >
            {busy === "photos"
              ? "Đang dựng ảnh..."
              : `✨ Dựng ${picked.length} ảnh · ${photoCost} credit`}
          </button>

          {busy === "photos" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {picked.map((id) => (
                <Shimmer key={id} className="aspect-square w-full" />
              ))}
            </div>
          ) : null}

          {photos ? (
            <div className="mt-8">
              <h3 className="text-sm font-semibold">Trước &amp; sau</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <figure className="overflow-hidden rounded-2xl border border-line bg-panel">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalUrl}
                    alt="Ảnh gốc"
                    className="aspect-square w-full object-cover opacity-70"
                  />
                  <figcaption className="p-3 text-xs text-muted">
                    Ảnh bạn chụp
                  </figcaption>
                </figure>

                {photos.map((p) => (
                  <figure
                    key={p.sceneId}
                    className="overflow-hidden rounded-2xl border border-line bg-panel"
                  >
                    {p.ok && p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.sceneName}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-raise p-4 text-center text-xs text-red-300">
                        {p.error}
                      </div>
                    )}
                    <figcaption className="flex items-center justify-between p-3">
                      <span className="truncate text-xs font-medium">
                        {p.sceneName}
                      </span>
                      {p.ok ? (
                        <a
                          href={p.url}
                          download
                          className="shrink-0 text-xs text-neon"
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
                  className={`${buttonGhostClass} mt-5`}
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
            className={`${buttonClass} w-full sm:w-auto`}
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
                <div className="text-sm font-semibold">Hashtag</div>
                <p className="mt-2 text-sm">
                  <span className="text-muted">Shopee: </span>
                  <span className="text-neon">
                    {listing.shopeeHashtags.join(" ")}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-muted">TikTok: </span>
                  <span className="text-neon">
                    {listing.tiktokHashtags.join(" ")}
                  </span>
                </p>
                <p className="mt-3 text-xs text-dim">
                  Từ khoá chạy quảng cáo: {listing.keywords.join(", ")}
                </p>
              </Card>

              {listing.issues.claims.length > 0 ? (
                <Card className="border-amber-500/30 bg-amber-500/10">
                  <div className="text-sm font-semibold text-amber-200">
                    ⚠ Cụm từ có rủi ro bị gỡ listing
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-amber-100/90">
                    {listing.issues.claims.map((c, i) => (
                      <li key={i}>
                        <b>&ldquo;{c.matched}&rdquo;</b> — {c.why}
                        <div className="text-amber-200/70">→ {c.fix}</div>
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
            className={`${buttonClass} w-full sm:w-auto`}
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
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(text)}
        className="rounded-lg border border-line bg-raise px-2.5 py-1 text-xs font-medium transition hover:border-dim"
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
  const pct = Math.min(100, (value.length / limit) * 100);
  return (
    <Card>
      <Header label={label} text={value} />
      <p className="mt-2 text-sm text-ink">{value}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-raise">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-neon"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-xs ${over ? "text-red-400" : "text-dim"}`}>
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
