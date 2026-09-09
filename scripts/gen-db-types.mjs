#!/usr/bin/env node
/**
 * Sinh src/lib/database.types.ts TỪ DATABASE ĐANG CHẠY.
 *
 * PostgREST phơi toàn bộ schema qua OpenAPI ở `GET /rest/v1/` — kèm kiểu cột,
 * giá trị enum, default, và cột nào NOT NULL. Đọc thẳng từ đó chính xác hơn đọc
 * một file schema, vì file có thể lệch với thực tế còn database thì không.
 *
 * Chạy:  npm run types:db
 */

import { writeFileSync } from "node:fs";

const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Chạy qua: node --env-file=.env scripts/gen-db-types.mjs",
  );
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`Không đọc được schema: HTTP ${res.status}`);
  process.exit(1);
}
const spec = await res.json();
const defs = spec.definitions ?? spec.components?.schemas ?? {};

/** Kiểu Postgres -> kiểu TypeScript. */
function tsType(prop, enums) {
  if (Array.isArray(prop.enum)) {
    const name = /public\."?([A-Za-z_]+)"?/.exec(prop.format ?? "")?.[1];
    if (name) {
      enums.set(name, prop.enum);
      return `Database["public"]["Enums"]["${name}"]`;
    }
    return prop.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  switch (prop.type) {
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "Json[]";
    case "object":
      return "Json";
    default:
      return prop.format === "json" || prop.format === "jsonb" ? "Json" : "string";
  }
}

const enums = new Map();
const tables = [];

for (const [table, def] of Object.entries(defs)) {
  if (!def.properties) continue;
  const required = new Set(def.required ?? []);
  const cols = Object.entries(def.properties).map(([name, prop]) => ({
    name,
    ts: tsType(prop, enums),
    nullable: !required.has(name),
    // Có default thì Insert không bắt buộc truyền.
    hasDefault: prop.default !== undefined,
  }));
  tables.push({ table, cols });
}

tables.sort((a, b) => a.table.localeCompare(b.table));

const L = [
  "/**",
  " * Kiểu bảng cho supabase-js — SINH TỰ ĐỘNG từ database đang chạy.",
  " *",
  " * Đừng sửa tay. Đổi schema xong chạy lại: npm run types:db",
  " */",
  "",
  "export type Json =",
  "  | string | number | boolean | null",
  "  | { [key: string]: Json | undefined }",
  "  | Json[];",
  "",
  "export type Database = {",
  "  public: {",
  "    Tables: {",
];

for (const { table, cols } of tables) {
  L.push(`      ${table}: {`);
  L.push("        Row: {");
  for (const c of cols) {
    L.push(`          ${c.name}: ${c.ts}${c.nullable ? " | null" : ""};`);
  }
  L.push("        };");
  L.push("        Insert: {");
  for (const c of cols) {
    const optional = c.nullable || c.hasDefault;
    L.push(
      `          ${c.name}${optional ? "?" : ""}: ${c.ts}${c.nullable ? " | null" : ""};`,
    );
  }
  L.push("        };");
  L.push("        Update: {");
  for (const c of cols) {
    L.push(`          ${c.name}?: ${c.ts}${c.nullable ? " | null" : ""};`);
  }
  L.push("        };");
  L.push("        Relationships: [];");
  L.push("      };");
}

L.push("    };");
L.push("    Views: Record<string, never>;");
L.push("    Functions: Record<string, never>;");
L.push("    Enums: {");
for (const [name, values] of [...enums].sort()) {
  L.push(`      ${name}: ${values.map((v) => JSON.stringify(v)).join(" | ")};`);
}
L.push("    };");
L.push("    CompositeTypes: Record<string, never>;");
L.push("  };");
L.push("};");
L.push("");

writeFileSync("src/lib/database.types.ts", L.join("\n"), "utf8");
console.log(
  `database.types.ts: ${tables.length} bảng, ${enums.size} enum — đọc từ ${url}`,
);
