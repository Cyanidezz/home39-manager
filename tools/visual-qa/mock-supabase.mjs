// Minimal stand-in for the Supabase REST + Auth endpoints the app calls, serving
// the fake data in fixtures.mjs. Read-only: writes are accepted and ignored.
// Usage: node tools/visual-qa/mock-supabase.mjs [port]
import http from "node:http";
import { publicBill, relations, tables, user } from "./fixtures.mjs";

const port = Number(process.argv[2] || 54321);
const nowSec = () => Math.floor(Date.now() / 1000);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function session() {
  const exp = nowSec() + 3600;
  const accessToken = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, role: "authenticated", aud: "authenticated", exp })}.mock`;
  return {
    access_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: exp,
    refresh_token: "mock-refresh-token", user,
  };
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0, current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) { parts.push(current); current = ""; } else current += char;
  }
  if (current) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseSelect(select) {
  return splitTopLevel(select || "*").map((item) => {
    const match = item.match(/^(?:(\w+):)?(\w+)(?:![\w]+)?(?:\((.*)\))?$/s);
    if (!match) return { name: item };
    const [, alias, name, inner] = match;
    return inner !== undefined ? { name, alias, children: parseSelect(inner) } : { name, alias };
  });
}

function project(row, table, columns) {
  const out = {};
  for (const column of columns) {
    if (column.name === "*") { Object.assign(out, row); continue; }
    if (column.children) {
      const rel = relations[table]?.[column.name];
      if (!rel) { out[column.alias || column.name] = []; continue; }
      const [kind, targetTable, targetCol, sourceCol] = rel;
      const matches = (tables[targetTable] || []).filter((target) => target[targetCol] === row[sourceCol]);
      const projected = matches.map((target) => project(target, targetTable, column.children));
      out[column.alias || column.name] = kind === "many" ? projected : projected[0] ?? null;
    } else {
      out[column.alias || column.name] = row[column.name] ?? null;
    }
  }
  return out;
}

function coerce(value, sample) {
  if (typeof sample === "number") return Number(value);
  if (typeof sample === "boolean") return value === "true";
  return value;
}

function matches(row, key, expr) {
  let [op, ...rest] = expr.split(".");
  let negate = false;
  if (op === "not") { negate = true; [op, ...rest] = rest; }
  const raw = rest.join(".");
  const cell = row[key];
  let result;
  switch (op) {
    case "eq": result = cell === coerce(raw, cell) || String(cell) === raw; break;
    case "neq": result = !(cell === coerce(raw, cell) || String(cell) === raw); break;
    case "gt": result = cell > coerce(raw, cell); break;
    case "gte": result = cell >= coerce(raw, cell); break;
    case "lt": result = cell < coerce(raw, cell); break;
    case "lte": result = cell <= coerce(raw, cell); break;
    case "in": result = raw.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(cell)); break;
    case "is": result = raw === "null" ? cell == null : String(cell) === raw; break;
    case "ilike": case "like": result = String(cell).toLowerCase().includes(raw.replace(/%/g, "").toLowerCase()); break;
    default: result = true;
  }
  return negate ? !result : result;
}

function query(table, params, accept) {
  let rows = [...(tables[table] || [])];
  const reserved = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
  for (const [key, expr] of params) {
    if (!reserved.has(key)) rows = rows.filter((row) => matches(row, key, expr));
  }
  const order = params.get("order");
  if (order) {
    const rules = order.split(",").map((rule) => rule.split("."));
    rows.sort((a, b) => {
      for (const [col, dir = "asc"] of rules) {
        if (a[col] === b[col]) continue;
        const cmp = a[col] > b[col] ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }
  if (params.get("limit")) rows = rows.slice(0, Number(params.get("limit")));
  const columns = parseSelect(params.get("select") || "*");
  const projected = rows.map((row) => project(row, table, columns));
  if (accept.includes("vnd.pgrst.object")) {
    if (projected.length !== 1) {
      return { status: 406, body: { code: "PGRST116", details: `The result contains ${projected.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" } };
    }
    return { status: 200, body: projected[0] };
  }
  return { status: 200, body: projected };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (status, body, headers = {}) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "access-control-allow-origin": req.headers.origin || "*",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      ...headers,
    });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  if (req.method === "OPTIONS") return send(204);
  console.log(`${req.method} ${url.pathname}${url.search.slice(0, 140)}`);

  let payload = "";
  req.on("data", (chunk) => (payload += chunk));
  req.on("end", () => {
    const path = url.pathname;
    if (path === "/auth/v1/token") return send(200, session());
    if (path === "/auth/v1/user") {
      return req.headers.authorization ? send(200, user) : send(401, { code: 401, msg: "missing token" });
    }
    if (path === "/auth/v1/logout") return send(204);
    if (path === "/auth/v1/settings") return send(200, { disable_signup: true, external: { email: true } });
    if (path.startsWith("/storage/v1/")) return send(400, { error: "mock storage", message: "not available in the visual-QA mock" });
    if (path.startsWith("/rest/v1/rpc/")) {
      const name = path.split("/").pop();
      if (name === "get_public_bill") {
        const token = JSON.parse(payload || "{}").p_token;
        return send(200, publicBill(token));
      }
      return send(200, null);
    }
    if (path.startsWith("/rest/v1/")) {
      const table = path.split("/").pop();
      if (req.method !== "GET" && req.method !== "HEAD") return send(201, []);
      const result = query(table, url.searchParams, req.headers.accept || "");
      return send(result.status, result.body);
    }
    return send(404, { message: "not found in mock" });
  });
});

server.listen(port, "127.0.0.1", () => console.log(`mock supabase on http://127.0.0.1:${port}`));
