// Uso: LEADS_APP_PASSWORD=... node encrypt.js [entrada.csv|leads.json] [saida]
// Nunca imprime a senha.
const fs = require("fs"); const { webcrypto: c } = require("crypto");
const ITER = 310000;
const src = process.argv[2] || "/workspace/leads/leads_instagram.csv";
const out = process.argv[3] || __dirname + "/data.enc.json";
const pw = process.env.LEADS_APP_PASSWORD;
if (!pw) { console.error("Defina LEADS_APP_PASSWORD"); process.exit(1); }
function parseCSV(t) { const rows = []; let r = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { r.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(f); rows.push(r); r = []; f = ""; }
    else f += ch; }
  if (f || r.length) { r.push(f); rows.push(r); }
  const h = rows.shift(); return rows.filter(x => x.length > 1).map(x => Object.fromEntries(h.map((k, i) => [k, x[i] || ""]))); }
const phone = s => { const d = (s || "").replace(/\D/g, ""); if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d; if (d.length === 10 || d.length === 11) return "55" + d; return ""; };
function load() { const t = fs.readFileSync(src, "utf8");
  if (src.endsWith(".json")) return JSON.parse(t);
  return parseCSV(t).map(x => ({ nome: x.business_name, handle: x.instagram_handle, url: x.profile_url === "n/d" ? "" : x.profile_url,
    nicho: x.niche, cidade: x.city_state, seg: x.followers, contato: x.public_contact, evid: x.evidence_no_store, fonte: x.source_url,
    crit: x["criterios_SN?"] || "??????", verificado: (x.verification || "").startsWith("verified"), bio: x.bio_link || "n/d",
    ult: x.last_post || "n/d", st0: x.status || "Novo", nota: x.note || "", tel: phone(x.phone || x.public_contact), add: x.added || "2026-10-22", regiao: (x.region || "brasil").toLowerCase() })); }
const b64 = u => Buffer.from(u).toString("base64");
async function main() {
  const leads = load(); const enc = new TextEncoder();
  const salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
  const base = await c.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await c.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = await c.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify({ geradoEm: new Date().toISOString(), leads })));
  fs.writeFileSync(out, JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
  console.log(`data.enc.json gerado (${leads.length} leads).`);
}
main().catch(e => { console.error("Erro:", e.message); process.exit(1); });
