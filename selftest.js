// Testa descriptografia das senhas configuradas. Imprime só OK/FAIL.
// Nunca imprime senha. LEADS_STAFF_PASSWORD, se existir, também precisa abrir.
const fs = require("fs"); const { webcrypto: c } = require("crypto");
const b = s => Buffer.from(s, "base64");
(async () => { try {
  const d = JSON.parse(fs.readFileSync(__dirname + "/data.enc.json", "utf8"));
  const staffPw = process.env.LEADS_STAFF_PASSWORD;
  const hasStaff = typeof staffPw === "string" && staffPw.length > 0;
  const envelope = Array.isArray(d.wraps) && d.wraps.length > 0;
  const derive = async (p, salt) => { const k = await c.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveKey"]);
    return c.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b(salt), iterations: d.iter }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); };
  const dec = (iv, key, ct) => c.subtle.decrypt({ name: "AES-GCM", iv: b(iv) }, key, b(ct));
  async function openWith(p) {
    if (envelope) {
      for (const w of d.wraps) {
        try {
          const raw = new Uint8Array(await dec(w.iv, await derive(p, w.salt), w.ct));
          const dk = await c.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
          const pt = JSON.parse(new TextDecoder().decode(await dec(d.iv, dk, d.ct)));
          return { leads: pt.leads, role: w.role === "staff" ? "staff" : "owner" };
        } catch { /* próximo envelope */ }
      }
      throw new Error("no");
    }
    const pt = JSON.parse(new TextDecoder().decode(await dec(d.iv, await derive(p, d.salt), d.ct)));
    return { leads: pt.leads, role: "owner" };
  }
  const owner = await openWith(process.env.LEADS_APP_PASSWORD || "");
  let staffOk = true;
  if (hasStaff) {
    const staff = await openWith(staffPw);
    staffOk = staff.role === "staff" && Array.isArray(staff.leads) && staff.leads.length === owner.leads.length;
  }
  let wrongRejected = false; try { await openWith("senha-errada-teste"); } catch { wrongRejected = true; }
  const ok = Array.isArray(owner.leads) && owner.role === "owner" && staffOk && wrongRejected && d.iter >= 200000;
  console.log(ok ? "OK" : "FAIL");
} catch { console.log("FAIL"); } })();
