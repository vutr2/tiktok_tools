"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Field, inputClass } from "@/components/ui";

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

export default function NewProductForm({
  defaultIndustry,
  industries,
  fieldsByIndustry,
  commonFields,
}: {
  defaultIndustry: string;
  industries: { value: string; label: string }[];
  fieldsByIndustry: Record<string, FieldDef[]>;
  commonFields: FieldDef[];
}) {
  const router = useRouter();
  const [industry, setIndustry] = useState(defaultIndustry);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = useMemo(
    () => [...commonFields, ...(fieldsByIndustry[industry] ?? [])],
    [commonFields, fieldsByIndustry, industry],
  );

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Chọn một ảnh sản phẩm.");

    const form = new FormData();
    form.set("name", name);
    form.set("industry", industry);
    form.set("image", file);
    form.set("info", JSON.stringify(info));

    setBusy(true);
    const res = await fetch("/api/products", { method: "POST", body: form });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "Tải lên không được");
    }
    const { id } = await res.json();
    router.push(`/app/p/${id}`);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Ngành hàng">
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className={inputClass}
        >
          {industries.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tên sản phẩm" hint="Tên bạn hay gọi, không cần chuẩn SEO.">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Serum niacinamide 10%"
          className={inputClass}
        />
      </Field>

      <Field
        label="Ảnh sản phẩm"
        hint="Đặt sản phẩm trên nền trơn, đủ sáng. Tối đa 12MB."
      >
        <label className="mt-1 block cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-brand/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Xem trước"
                className="aspect-square w-full max-w-xs object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur">
                Đổi ảnh khác
              </span>
            </div>
          ) : (
            <div className="flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-panel text-center transition hover:border-brand/50">
              <span className="text-4xl">📷</span>
              <span className="text-sm font-medium">Chọn ảnh sản phẩm</span>
              <span className="px-6 text-xs text-dim">
                Chụp bằng điện thoại là được — máy sẽ tách nền rồi ghép bối cảnh
              </span>
            </div>
          )}
        </label>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              required={f.required}
              value={info[f.key] ?? ""}
              onChange={(e) =>
                setInfo((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
              className={inputClass}
            />
          </Field>
        ))}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button type="submit" disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>
        {busy ? "Đang tải lên..." : "Lưu sản phẩm"}
      </button>
    </form>
  );
}
