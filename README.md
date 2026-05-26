# Louvre Dental Centre

Modern, single-page website for **Louvre Dental Centre** — a family, cosmetic & emergency dental clinic at 1070 Rest Acres Rd, Unit G7, Paris, ON.

Built as a fast static front-end with one Vercel serverless function for the appointment form. Designed for strong SEO, AEO (answer-engine optimization) and AI-search visibility.

## Stack

- Static `index.html` + `assets/css/styles.css` + `assets/js/main.js` (no build step)
- `api/send.js` — Vercel serverless function (Node) that emails appointment requests via SMTP using [nodemailer](https://nodemailer.com/)
- Deploys to **Vercel**

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#365362` | Headings, header, footer |
| Accent | `#0fc5da` | Buttons, highlights |
| Backgrounds | `#f8f9fb` · `#e9f4f7` · `#c5e0e7` | Sections / cards |
| Fonts | Playfair Display · Inter · Poppins | Headings · body · UI |

## Homepage sections

Top bar (address · email · phone · Instagram) → sticky header → hero → **appointment form (under hero)** → value strip → "dentist near you" intro → services grid (9) → about → why-choose-us → meet the team → insurance & CDCP → reviews → FAQ → service area → contact + map → final CTA → footer. A sticky **call/book bar** stays pinned to the bottom on mobile.

## Local preview

```bash
# any static server works for the front-end, e.g.
npx serve .
# the /api/send form handler only runs on Vercel (or `vercel dev`)
```

## Appointment form / email

`api/send.js` sends each submission to `info@louvredental.ca`. Configure these in **Vercel → Project Settings → Environment Variables** (see `.env.example`):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (required)
- `TO_EMAIL`, `FROM_EMAIL`, `SITE_URL` (optional)

## Deploy (Vercel)

1. Import the GitHub repo into Vercel.
2. Framework preset: **Other** (no build command; output is the repo root).
3. Add the SMTP environment variables.
4. Deploy. Point `louvredental.ca` at the Vercel project.

## Images

Real clinic photography (reception, treatment rooms, exterior) and the clinic's own
service/doctor images live in `assets/images/`. Replace the placeholder testimonial
quotes in `index.html` with real Google reviews when available.
