"use client";

import { useState } from "react";
import { Badge, buttonClass, buttonGhostClass, Card } from "@/components/ui";

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

type Scene30 = {
  seconds: number;
  voiceover: string;
  shot: string;
  onScreenText: string;
};

type Script = {
  angle: string;
  objectionHandled: string;
  hook: Scene30;
  scenes: Scene30[];
  cta: string;
  totalSeconds: number;
  warnings: string[];
};

export default function Workbench({
  productId,
  scenes,
  cost,
  balance: initialBalance,
}: {
  productId: string;
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
  const [scripts, setScripts] = useState<Script[] | null>(null);

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
    <div className="mt-8">
      <div className="flex gap-2 border-b border-[--color-line]">
        {(
          [
            ["photos", "Ảnh sản phẩm"],
            ["listing", "Mô tả sàn"],
            ["scripts", "Kịch bản video"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key
                ? "border-[--color-brand] text-[--color-brand]"
                : "border-transparent text-[--color-muted]"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-[--color-muted]">
          Còn {balance} credit
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "photos" ? (
        <section className="mt-6">
          <p className="text-sm text-[--color-muted]">
            Chọn bối cảnh muốn dựng. Mỗi ảnh {cost.PRODUCT_PHOTO_PER_SCENE}{" "}
            credit — chọn ít lại nếu chỉ cần ảnh bìa.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  className={`rounded-xl border p-4 text-left ${
                    on
                      ? "border-[--color-brand] bg-[--color-brand-soft]"
                      : "border-[--color-line] bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="mt-1 text-xs text-[--color-muted]">
                    {s.useCase}
                  </div>
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
            className={`${buttonClass} mt-5`}
          >
            {busy === "photos"
              ? "Đang dựng ảnh..."
              : `Dựng ${picked.length} ảnh (${photoCost} credit)`}
          </button>

          {photos ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {photos.map((p) => (
                <Card key={p.sceneId}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.sceneName}</span>
                    <Badge tone={p.ok ? "ok" : "error"}>
                      {p.ok ? "Xong" : "Lỗi — đã hoàn credit"}
                    </Badge>
                  </div>
                  {p.ok && p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.sceneName}
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <p className="text-sm text-red-600">{p.error}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

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
            className={buttonClass}
          >
            {busy === "listing"
              ? "Đang viết..."
              : `Viết mô tả (${cost.LISTING_COPY} credit)`}
          </button>

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
                <pre className="mt-2 whitespace-pre-wrap text-sm">
                  {listing.description}
                </pre>
                {listing.bulletPoints.length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 text-sm">
                    {listing.bulletPoints.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card>
                <div className="text-sm font-semibold">Hashtag</div>
                <p className="mt-2 text-sm">
                  <span className="text-[--color-muted]">Shopee: </span>
                  {listing.shopeeHashtags.join(" ")}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-[--color-muted]">TikTok: </span>
                  {listing.tiktokHashtags.join(" ")}
                </p>
                <p className="mt-3 text-xs text-[--color-muted]">
                  Từ khoá chạy quảng cáo: {listing.keywords.join(", ")}
                </p>
              </Card>

              {listing.issues.claims.length > 0 ? (
                <Card className="border-amber-300 bg-amber-50">
                  <div className="text-sm font-semibold">
                    Cụm từ có rủi ro bị gỡ listing
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {listing.issues.claims.map((c, i) => (
                      <li key={i}>
                        <b>&ldquo;{c.matched}&rdquo;</b> — {c.why}
                        <div className="text-[--color-muted]">→ {c.fix}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

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
            className={buttonClass}
          >
            {busy === "scripts"
              ? "Đang viết kịch bản..."
              : `Viết 5 kịch bản (${cost.VIDEO_SCRIPT} credit)`}
          </button>

          {scripts ? (
            <div className="mt-6 space-y-4">
              {scripts.map((s, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      Kịch bản {i + 1}: {s.angle}
                    </div>
                    <Badge tone={Math.abs(s.totalSeconds - 30) <= 2 ? "ok" : "warn"}>
                      {s.totalSeconds}s
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[--color-muted]">
                    Đập lại phản đối: {s.objectionHandled}
                  </p>

                  <div className="mt-3 rounded-lg bg-[--color-brand-soft] p-3">
                    <div className="text-xs font-semibold uppercase text-[--color-brand]">
                      Hook {s.hook.seconds}s
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      {s.hook.voiceover}
                    </p>
                    <p className="mt-1 text-xs text-[--color-muted]">
                      Cảnh: {s.hook.shot}
                    </p>
                    <p className="text-xs text-[--color-muted]">
                      Chữ trên màn hình: {s.hook.onScreenText}
                    </p>
                  </div>

                  <ol className="mt-3 space-y-3">
                    {s.scenes.map((sc, j) => (
                      <li key={j} className="border-l-2 border-[--color-line] pl-3">
                        <div className="text-xs font-semibold text-[--color-muted]">
                          {sc.seconds}s
                        </div>
                        <p className="text-sm">{sc.voiceover}</p>
                        <p className="text-xs text-[--color-muted]">
                          Cảnh: {sc.shot}
                        </p>
                        <p className="text-xs text-[--color-muted]">
                          Chữ: {sc.onScreenText}
                        </p>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-3 text-sm font-medium">CTA: {s.cta}</p>

                  {s.warnings.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-amber-700">
                      {s.warnings.map((w, k) => (
                        <li key={k}>⚠ {w}</li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              ))}
            </div>
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
        className={`${buttonGhostClass} px-2 py-1 text-xs`}
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
      <p className="mt-2 text-sm">{value}</p>
      <p
        className={`mt-1 text-xs ${over ? "text-red-600" : "text-[--color-muted]"}`}
      >
        {value.length}/{limit} ký tự
      </p>
      {issues.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {issues.map((i, k) => (
            <li
              key={k}
              className={i.level === "error" ? "text-red-600" : "text-amber-700"}
            >
              {i.message}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
