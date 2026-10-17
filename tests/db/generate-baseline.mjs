// Rebuilds tests/db/baseline.sql from the linked Supabase project's catalog.
// Read-only: it only runs SELECTs against pg_catalog / information_schema (no row data is read).
//   node tests/db/generate-baseline.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function query(sql) {
  const output = execFileSync("npx", ["supabase", "db", "query", "--linked", sql], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(output.slice(output.indexOf("{"))).rows;
}

const tables = query("select tablename from pg_tables where schemaname='public' order by 1").map((r) => r.tablename);
const columns = query(
  "select table_name, column_name, udt_name, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default, is_identity, identity_generation from information_schema.columns where table_schema='public' and table_name in (select tablename from pg_tables where schemaname='public') order by table_name, ordinal_position"
);
const constraints = query(
  "select c.conrelid::regclass::text as tbl, c.conname, c.contype, pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by c.conrelid::regclass::text, c.contype desc, c.conname"
);
const indexes = query("select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by tablename, indexname");
const functions = query(
  "select p.proname, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname"
);
const views = query("select viewname, definition from pg_views where schemaname='public'");
const triggers = query(
  "select tgrelid::regclass::text as tbl, tgname, pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace)"
);

const typeNames = { int4: "integer", int8: "bigint", bool: "boolean", _text: "text[]" };
function columnType(c) {
  if (c.udt_name === "numeric") return c.numeric_precision ? `numeric(${c.numeric_precision},${c.numeric_scale})` : "numeric";
  if (c.udt_name === "varchar") return c.character_maximum_length ? `varchar(${c.character_maximum_length})` : "varchar";
  return typeNames[c.udt_name] ?? c.udt_name;
}

const out = [
  "-- Schema-only snapshot of the production `public` schema (no data), generated from the live catalog",
  "-- with read-only queries (tests/db/generate-baseline.mjs). Used by tests/db to run the SQL functions",
  "-- against an in-memory Postgres (PGlite). Regenerate when migrations change the schema.",
  "",
];
for (const table of tables) {
  const lines = columns
    .filter((c) => c.table_name === table)
    .map((c) => {
      let line = `  "${c.column_name}" ${columnType(c)}`;
      if (c.is_identity === "YES") line += ` generated ${c.identity_generation === "ALWAYS" ? "always" : "by default"} as identity`;
      else if (c.column_default !== null) line += ` default ${c.column_default}`;
      if (c.is_nullable === "NO") line += " not null";
      return line;
    });
  out.push(`create table public."${table}" (\n${lines.join(",\n")}\n);\n`);
}
const order = { p: 0, u: 1, c: 2, f: 3 };
for (const c of [...constraints].sort((a, b) => (order[a.contype] ?? 9) - (order[b.contype] ?? 9))) {
  out.push(`alter table public."${c.tbl.replace("public.", "")}" add constraint "${c.conname}" ${c.def};`);
}
out.push("");
const constraintNames = new Set(constraints.map((c) => c.conname));
for (const i of indexes) if (!constraintNames.has(i.indexname)) out.push(`${i.indexdef};`);
out.push("");
for (const v of views) out.push(`create view public."${v.viewname}" as ${v.definition}\n`);
for (const f of functions) out.push(`${f.def.trimEnd()};\n`);
for (const t of triggers) out.push(`${t.def};`);

writeFileSync(new URL("./baseline.sql", import.meta.url), `${out.join("\n")}\n`);
console.log(`baseline.sql: ${tables.length} tables, ${functions.length} functions, ${views.length} view(s), ${triggers.length} trigger(s)`);
