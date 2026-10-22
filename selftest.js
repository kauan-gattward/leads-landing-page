// Testa descriptografia com LEADS_APP_PASSWORD. Imprime só OK/FAIL.
const fs = require("fs"); const { webcrypto: c } = require("crypto");
(async () => { try {
  const d = JSON.parse(fs.readFileSync(__dirname + "/data.enc.json", "utf8")); const b = s => Buffer.from(s, "base64");
  const dk = async p => { const k = await c.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveKey"]);
    return c.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b(d.salt), iterations: d.iter }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); };
  const pt = await c.subtle.decrypt({ name: "AES-GCM", iv: b(d.iv) }, await dk(process.env.LEADS_APP_PASSWORD || ""), b(d.ct));
  const ok = Array.isArray(JSON.parse(new TextDecoder().decode(pt)).leads);
  let wrongRejected = false; try { await c.subtle.decrypt({ name: "AES-GCM", iv: b(d.iv) }, await dk("senha-errada-teste"), b(d.ct)); } catch { wrongRejected = true; }
  console.log(ok && wrongRejected && d.iter >= 200000 ? "OK" : "FAIL");
} catch { console.log("FAIL"); } })();
