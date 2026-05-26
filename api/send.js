// Vercel serverless function for the Louvre Dental Centre appointment form.
// Receives the POST from the homepage "Request an Appointment" form,
// validates it, and emails the front desk (info@louvredental.ca) via SMTP.
//
// The homepage submits with fetch() and expects JSON back, but this handler
// also works for a plain HTML form POST (it will 303-redirect to "/?sent=1").
//
// Required env vars (Vercel -> Project Settings -> Environment Variables):
//   SMTP_HOST   e.g. "smtp.your-host.com"
//   SMTP_PORT   e.g. "587" (STARTTLS) or "465" (SMTPS)
//   SMTP_USER   the sending mailbox username
//   SMTP_PASS   the mailbox password / app password
//
// Optional env vars (sensible defaults):
//   TO_EMAIL    defaults to "info@louvredental.ca"
//   FROM_EMAIL  defaults to SMTP_USER
//   SITE_URL    defaults to "https://louvredental.ca"

const nodemailer = require("nodemailer");

const TO_EMAIL = process.env.TO_EMAIL || "info@louvredental.ca";
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || "no-reply@louvredental.ca";
const FROM_NAME = "Louvre Dental website";
const SITE_URL = process.env.SITE_URL || "https://louvredental.ca";
const EMAIL_SUBJECT = "New appointment request from your website";

const safeStr = (v) => String(v == null ? "" : v).trim();
const stripCRLF = (v) => safeStr(v).replace(/[\r\n]+/g, " ").slice(0, 500);
const isValidEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function escapeHtml(s) {
  return safeStr(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const PATIENT_LABEL = { new: "New patient", existing: "Existing patient" };
const SERVICE_LABEL = {
  checkup: "Checkup & cleaning", emergency: "Emergency / toothache",
  cosmetic: "Cosmetic / whitening", orthodontics: "Orthodontics / aligners",
  implants: "Dental implants", kids: "Kids dentistry", other: "Something else",
};

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let raw = req.body;
  if (raw == null) {
    raw = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString("utf8");
  if (typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) { try { return JSON.parse(trimmed); } catch (e) { /* fall through */ } }
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

function buildPlainText(f) {
  const d = (v) => v || "-";
  return [
    "New appointment request from the Louvre Dental website.",
    "",
    "Name:           " + d(f.name),
    "Phone:          " + d(f.phone),
    "Email:          " + d(f.email),
    "Preferred date: " + d(f.preferred),
    "",
    "Message:",
    f.message || "-",
    "",
    "Reply to this email to respond to the patient.",
    "Submitted " + f.submittedAt,
  ].join("\n");
}

function buildHtml(f) {
  const E = escapeHtml;
  const row = (l, v) =>
    '<p style="margin:0 0 6px"><strong style="display:inline-block;min-width:140px;color:#555">' +
    E(l) + ':</strong> ' + E(v || "-") + "</p>";
  const msg = f.message
    ? '<p style="margin:14px 0 0"><strong style="color:#555">Message:</strong><br>' +
      '<span style="white-space:pre-wrap">' + E(f.message) + "</span></p>"
    : "";
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">' +
    '<p style="margin:0 0 14px">You have a new appointment request from the Louvre Dental website:</p>' +
    row("Name", f.name) + row("Phone", f.phone) + row("Email", f.email) +
    row("Preferred date", f.preferred) +
    msg +
    '<p style="margin:18px 0 0;color:#888;font-size:13px">Reply to this email to respond to the patient. Submitted ' +
    E(f.submittedAt) + ".</p></div>";
}

module.exports = async (req, res) => {
  const wantsJson =
    (req.headers["accept"] || "").includes("application/json") ||
    (req.headers["content-type"] || "").includes("application/json") ||
    req.headers["x-requested-with"] === "fetch";

  const fail = (status, location, payload) => {
    if (wantsJson) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(payload || { ok: false }));
    }
    res.statusCode = 303;
    res.setHeader("Location", SITE_URL + location);
    return res.end();
  };

  if (req.method !== "POST") return fail(405, "/#appointment", { ok: false, error: "method" });

  let body = {};
  try { body = await readBody(req); }
  catch (e) { return fail(400, "/#appointment?error=bad-request", { ok: false, error: "bad-request" }); }

  // Honeypot — silently accept bot submissions.
  if (body.website || body._hp) {
    if (wantsJson) { res.statusCode = 200; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ ok: true })); }
    res.statusCode = 303; res.setHeader("Location", SITE_URL + "/?sent=1"); return res.end();
  }

  const name = stripCRLF(body.name);
  const email = stripCRLF(body.email);
  const phone = stripCRLF(body.phone);

  if (!name || !(phone || (email && isValidEmail(email)))) {
    return fail(422, "/#appointment?error=missing-fields", { ok: false, error: "missing-fields" });
  }

  const fields = {
    name, email, phone,
    patient: PATIENT_LABEL[body.patient] || stripCRLF(body.patient),
    service: SERVICE_LABEL[body.service] || stripCRLF(body.service),
    preferred: stripCRLF(body.preferred),
    message: safeStr(body.message).slice(0, 4000),
    submittedAt: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
    replyTo: email && isValidEmail(email) ? email : "",
  };

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error("SMTP env vars missing", { hasHost: !!host, hasUser: !!user, hasPass: !!pass });
    return fail(500, "/#appointment?error=server-not-configured", { ok: false, error: "server-not-configured" });
  }

  const transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: '"' + FROM_NAME + '" <' + FROM_EMAIL + ">",
      to: TO_EMAIL,
      replyTo: fields.replyTo ? '"' + name + '" <' + fields.replyTo + ">" : undefined,
      subject: EMAIL_SUBJECT,
      text: buildPlainText(fields),
      html: buildHtml(fields),
    });
  } catch (err) {
    console.error("SMTP send failed:", err);
    return fail(502, "/#appointment?error=send-failed", { ok: false, error: "send-failed" });
  }

  if (wantsJson) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true }));
  }
  res.statusCode = 303;
  res.setHeader("Location", SITE_URL + "/?sent=1");
  return res.end();
};
