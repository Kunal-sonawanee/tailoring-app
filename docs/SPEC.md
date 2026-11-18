# Tailoring App — Requirements & Build Spec (V1 usable prototype)

Owner: Kanthya (Kantex Technologies) · Client: The Stitch Art, Nashik · Version: 0.1 (18 Nov 2026)

Items marked **[CONFIRM]** are assumptions to verify against the shop's paper register.

---

## 1. Goal
Replace the shop's paper registers (customer + measurements register, and the order notebook with names, numbers and dates) with a phone app the owner uses daily.

**Trial success measure (15–20 days):** every new order is entered in the app, and no new orders go on paper.

## 2. User
- One user in V1: the **shop owner**. Uses an Android phone with Chrome. Prefers Marathi. Non-technical.
- Mostly ladies' garments; men's garments occasionally (known customers).
- Employees (4–5) **don't log in** in V1. They exist only as names/codes to assign work to.

## 3. Scope

### In V1
1. Login (mobile number + 4-digit PIN)
2. One-time shop setup (shop details, employees, garment types, starting serial number)
3. Customers: serial no., name, mobile, measurements per garment, note
4. Orders: one or more garments per order, assigned employee, order/trial/due dates, status
5. Design sketch: draw on screen **or** photo of a paper sketch
6. Fabric photos and reference photos (compressed before upload)
7. Due-date alerts on the Home screen
8. Advance (Yes/No + amount → balance shown)
9. WhatsApp "send update" button (pre-written Marathi messages)
10. Language: Marathi (default), Hindi and English selectable
11. Backups (automatic) + "Download my data (Excel)"

### Not in V1 (later)
- Push notifications, offline data entry, employee logins, online payments/subscriptions billing, WhatsApp Business API, SMS, invoices/GST, reports.

## 4. Language & UI rules
- Languages: `mr` (default), `hi`, `en`. Switch in Settings. Every string comes from i18n files.
- Digits always English. Dates DD/MM/YYYY. Currency ₹ with Indian grouping (₹1,25,000).
- Font: **Noto Sans Devanagari** (self-hosted, subset) + system sans for Latin.
- Base width 360 px. Body 16 px, labels 18 px, primary buttons 52 px tall, full width.
- Bottom navigation (4 tabs): **Home · Customers · + New Order · Settings**.
- Colours:
  - Primary `#7C3AED` (violet), text `#111827`, muted `#6B7280`, background `#F9FAFB`, card `#FFFFFF`
  - Alerts: 2 days left `#FACC15` (yellow) · 1 day left `#F97316` (orange) · due today `#EF4444` (red) · overdue `#991B1B` (dark red)
  - Status chips: Pipeline `#6B7280` · In process `#2563EB` · Ready `#16A34A` · Delivered `#111827` · Cancelled `#9CA3AF`

## 5. Data model (D1 / SQLite)
All IDs are text UUIDs unless noted. All tables have `created_at`, `updated_at` (ISO strings, UTC). Soft delete via `deleted_at`.

```sql
shops(
  id, name, owner_name, phone, address, logo_key NULL,
  language TEXT DEFAULT 'mr',
  next_customer_serial INTEGER DEFAULT 1,   -- set at setup to continue the paper register
  next_order_no INTEGER DEFAULT 1,
  plan TEXT DEFAULT 'trial',                -- trial | active | expired
  trial_ends_at NULL
)

users(
  id, shop_id, phone UNIQUE, pin_hash, pin_salt,
  role TEXT DEFAULT 'owner', last_login_at NULL
)

sessions(
  id, user_id, shop_id, expires_at          -- 90-day sessions, HttpOnly cookie
)

employees(
  id, shop_id, code TEXT,                   -- e.g. "E1"
  name, phone NULL, active INTEGER DEFAULT 1
)

garment_types(
  id, shop_id, key TEXT,                    -- 'blouse', 'kurta', ...
  name_mr, name_hi, name_en,
  gender TEXT,                              -- 'F' | 'M'
  fields TEXT,                              -- JSON array of measurement field keys, in display order
  sort_order INTEGER, active INTEGER DEFAULT 1
)

customers(
  id, shop_id, serial_no INTEGER,           -- per-shop, auto from shops.next_customer_serial
  name, phone NULL, gender TEXT DEFAULT 'F',
  address NULL, note NULL,                  -- note = free text, e.g. "shoulder alteration"
  deleted_at NULL,
  UNIQUE(shop_id, serial_no)
)

customer_measurements(
  id, shop_id, customer_id, garment_type_id,
  values TEXT,                              -- JSON { "length": 14.5, "shoulder": 14, ... } inches
  note NULL,
  UNIQUE(customer_id, garment_type_id)      -- latest measurements per garment
)

orders(
  id, shop_id, order_no INTEGER,            -- per-shop, auto from shops.next_order_no
  customer_id, order_date, trial_date NULL, due_date,   -- dates as 'YYYY-MM-DD' (IST)
  status TEXT DEFAULT 'pipeline',           -- pipeline | in_process | ready | delivered | cancelled
  total_amount INTEGER NULL,                -- rupees
  advance_paid INTEGER DEFAULT 0,           -- 0/1
  advance_amount INTEGER DEFAULT 0,
  note NULL, delivered_at NULL, deleted_at NULL,
  UNIQUE(shop_id, order_no)
)

order_items(
  id, shop_id, order_id, garment_type_id,
  qty INTEGER DEFAULT 1,
  employee_id NULL,                         -- who is stitching it
  measurements_snapshot TEXT,               -- JSON copy at order time (old orders stay correct)
  style_note NULL,                          -- e.g. "boat neck, no sleeves, back dori"
  sketch_json NULL,                         -- drawing strokes (see §8)
  sketch_preview_key NULL                   -- R2 key of 600px WebP preview
)

attachments(
  id, shop_id, order_item_id,
  kind TEXT,                                -- fabric | reference | paper_sketch
  r2_key, thumb_key, width, height, bytes,
  deleted_at NULL
)
```

Indexes: `customers(shop_id, name)`, `customers(shop_id, phone)`, `orders(shop_id, status, due_date)`, `order_items(order_id)`, `attachments(order_item_id)`.

**Balance** = `total_amount - advance_amount` (computed, not stored).

## 6. Default garments & measurement fields [CONFIRM]
Seeded per shop at setup; owner can rename, hide or reorder in Settings. Unit: inches, step 0.25, range 0–80.

| key | Marathi | Gender | Fields |
|---|---|---|---|
| blouse | ब्लाउज | F | length, shoulder, upper_chest, chest, waist, armhole, sleeve_length, sleeve_round, front_neck, back_neck, point |
| kurta | कुर्ता | F | length, shoulder, chest, waist, hip, armhole, sleeve_length, sleeve_round, front_neck, back_neck, slit |
| salwar | सलवार / पायजमा | F | length, waist, hip, thigh, knee, bottom |
| dress_set | पंजाबी ड्रेस | F | kurta fields + salwar fields (prefix `top_`, `bottom_`) |
| gown | गाऊन | F | length, shoulder, chest, waist, hip, armhole, sleeve_length, sleeve_round, front_neck, back_neck |
| lehenga | लेहेंगा | F | length, waist, hip, flare |
| shirt | शर्ट | M | length, shoulder, chest, stomach, seat, sleeve_length, cuff, collar |
| pant | पँट | M | length, waist, seat, thigh, knee, bottom |

Field labels (mr / en):
length लांबी · shoulder खांदा · upper_chest वरची छाती · chest छाती · waist कंबर · hip / seat सीट · stomach पोट · armhole आर्महोल · sleeve_length बाही लांबी · sleeve_round बाही गोल · front_neck पुढचा गळा · back_neck मागचा गळा · point पॉइंट · slit साईड कट · thigh मांडी · knee गुडघा · bottom मोहरी · flare घेर · cuff कफ · collar कॉलर

## 7. Photos (fabric, reference, paper sketch)
- Source: camera or gallery (`<input type="file" accept="image/*" capture="environment">` + a gallery option).
- **Compress in the browser before upload:**
  - Main image: longest side **1080 px**, WebP quality **0.70**. If result > 200 KB, re-encode at 0.60.
  - Thumbnail: longest side **320 px**, WebP quality **0.60** (~15–25 KB).
  - Strip EXIF (canvas re-encode does this). Fix orientation before drawing to canvas.
- Target: **≤ 150 KB per photo** (camera originals are 3–5 MB).
- Max **6 photos per garment item**.
- Upload: `POST /api/attachments` (multipart: file + thumb + order_item_id + kind). Worker stores at
  `shops/{shop_id}/orders/{order_id}/{attachment_id}.webp` and `..._thumb.webp`.
- Serve: `GET /api/files/:attachment_id` → Worker checks `shop_id`, streams from R2, `Cache-Control: private, max-age=86400`.
- Kinds and labels: fabric = कापड · reference = डिझाइन फोटो · paper_sketch = कागदावरचे डिझाइन.

## 8. Design sketch (drawing board)
- Full-screen drawing view opened from an order item.
- Logical canvas **1000 × 1000**, scaled to screen width. Pointer Events (finger + stylus). Prevent page scroll while drawing.
- Tools (big buttons, bottom bar): pen size **2 / 4 / 8**, colours **black `#111827` / red `#DC2626` / blue `#2563EB`**, eraser (removes a whole stroke on touch), undo, redo, clear (with confirm), save.
- Background templates (light grey `#D1D5DB` outlines, not editable): **blank**, **blouse front**, **blouse back**, **kurta front**, **neck shapes**. Stored as SVG in `public/templates/`. [CONFIRM which shapes he draws most]
- Saved format (`order_items.sketch_json`):
  ```json
  { "v": 1, "template": "blouse_front", "strokes": [ { "c": "#111827", "s": 4, "p": [[x,y,pressure], ...] } ] }
  ```
  Round points to 1 decimal. Typical size 5–20 KB.
- On save also render a **600 px WebP preview** (quality 0.7) → R2 → `sketch_preview_key`, used in lists.
- Alternative button on the same screen: **"कागदावरचे डिझाइन फोटो काढा"** (take a photo of the paper sketch) → attachment kind `paper_sketch`.

## 9. Due-date alerts
Applies to orders with status `pipeline` or `in_process`. "Today" = current date in Asia/Kolkata.

| Bucket | Rule | Colour | Marathi label |
|---|---|---|---|
| Overdue | due_date < today | `#991B1B` | मुदत संपली (X दिवस) |
| Today | due_date = today | `#EF4444` | आज द्यायचे |
| 1 day | due_date = today + 1 | `#F97316` | उद्या द्यायचे |
| 2 days | due_date = today + 2 | `#FACC15` | 2 दिवस बाकी |

- **Home screen** shows four count cards (Overdue, Today, Tomorrow, 2 days) and below them a list sorted by due_date ascending (overdue first).
- Orders with `trial_date = today` are shown in a separate "आजचे ट्रायल" (today's trials) row.
- App icon badge (Badging API, where supported) = overdue + today count.
- V2: web push notification at 9:00 AM IST daily.

## 10. WhatsApp updates
- Button on Customer and Order screens: **"WhatsApp वर पाठवा"**. Disabled if no phone number.
- Opens `https://wa.me/91{phone}?text={encoded message}`. No API, ₹0.
- Pick from templates (Marathi default, language follows app setting); the owner can edit before sending in WhatsApp:
  1. **Order ready:** "नमस्कार {name}, तुमचे {garment} तयार आहे. कृपया {shop_name} मधून घेऊन जा. बाकी रक्कम: ₹{balance}."
  2. **Trial:** "नमस्कार {name}, तुमच्या {garment} चे ट्रायल {trial_date} रोजी आहे. — {shop_name}"
  3. **Order received:** "नमस्कार {name}, तुमची ऑर्डर #{order_no} मिळाली. देण्याची तारीख: {due_date}. — {shop_name}"
- Lines with empty variables (e.g. no balance) are dropped.

## 11. Screens
1. **Login:** mobile number (10 digits) → 4-digit PIN. "Forgot PIN" = contact Kantex (V1).
2. **Shop setup (first login, 4 steps):** shop name, owner name, phone, address, logo (optional) → employees (name + auto code E1, E2…) → garments (tick from defaults) → **starting customer serial no.** (continue from paper register) and starting order no.
3. **Home:** alert cards + due list + today's trials + "+ New Order" button.
4. **Customers:** search box (name / phone / serial no.), list showing serial no., name, phone, last order date. "+ Add customer".
5. **Customer detail:** info + note, measurements per garment (tabs), order history, WhatsApp button, edit.
6. **New order (one scrolling form):**
   - Pick customer (search) or add new inline
   - Garments: add one or more items → for each: garment type, qty, measurements (pre-filled from customer's saved ones, editable; editing also updates the customer's saved measurements), assigned employee (dropdown of name + code), style note, sketch, photos
   - Dates: order date (default today), trial date (optional), due date (required)
   - Money (collapsed by default): total ₹, advance Yes/No, advance ₹ → balance shown
   - Save → order no. shown big (for the owner to write on the fabric/slip)
7. **Order detail:** status buttons (one tap to change), items with sketch/photos, dates, money, WhatsApp, edit.
8. **Orders list (from Home "see all"):** filter chips by status + by employee.
9. **Settings:** shop details, employees (add/edit/deactivate), garments & fields, language, **Download my data (Excel)**, logout.

## 12. Build phases & checklist
Deploy after every phase and test on an Android phone in Chrome.

- [ ] **Phase 0 — Setup:** scaffold Vite+React+TS+Tailwind, Hono Worker with static assets, create D1 `tailoring-db` and R2 `tailoring-files`, `wrangler.toml` bindings, i18n skeleton (mr/hi/en), PWA manifest + icons, first deploy.
- [ ] **Phase 1 — Auth & setup:** migrations for all tables, PIN login (PBKDF2 via WebCrypto, 100k iterations), sessions, shop setup wizard, seed garments (§6), employees CRUD.
- [ ] **Phase 2 — Customers:** add/edit/search, serial numbers, measurements per garment, note.
- [ ] **Phase 3 — Orders & alerts:** new order form, items, employee assignment, statuses, dates, Home alerts (§9), orders list with filters.
- [ ] **Phase 4 — Sketch & photos:** drawing board (§8), templates, photo compression + upload + viewer (§7).
- [ ] **Phase 5 — Money, WhatsApp, export, backups:** advance/balance, WhatsApp templates (§10), Excel export, backups (§13).
- [ ] **Phase 6 — Polish & trial launch:** Marathi text review with the owner, empty states, loading states, install-to-home-screen guide, enter 5 real customers together with the owner, start the trial.

**Definition of done (whole V1):** the owner can, on his phone, add a customer with measurements, create an order with a sketch and a fabric photo, assign it to an employee, see it on Home 2 days before due, mark it ready, and send a WhatsApp message — in Marathi, in under 3 minutes per order.

## 13. Backups & safety
1. **D1 Time Travel** (built in): restore to any minute in the last 7 days (free plan) / 30 days (paid plan).
2. **Nightly export:** Worker cron trigger at `30 21 * * *` (03:00 IST) exports all tables as JSON → gzip → R2 `backups/{YYYY-MM-DD}.json.gz`. Keep the last 30, delete older.
3. **Weekly off-Cloudflare copy:** GitHub Action every Sunday runs `wrangler d1 export tailoring-db --remote` and uploads it as a workflow artifact (retention 90 days). **Repo must stay private.** Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. **Owner export:** Settings → "Download my data" → `.xlsx` with sheets Customers, Measurements, Orders.
5. Photos: monthly manual copy of the R2 bucket to Google Drive (V1); automate later.

Security basics: HttpOnly + Secure + SameSite=Lax session cookie; rate-limit login to 5 tries / 15 min per phone; every `/api/*` route checks session and `shop_id`; R2 bucket is private.

## 14. Cost (The Stitch Art only)
- Cloudflare Workers + D1 + R2 free tiers: **₹0/month**
- Expected usage: ~10 orders/day × 2 photos × 150 KB ≈ 90 MB/month ≈ 1 GB/year (R2 free: 10 GB)
- Domain (optional): ~₹500–1,000/year. Trial runs on the free `*.workers.dev` URL.
- Upgrade to Workers Paid ($5/month) only when we have ~20+ shops or need 30-day Time Travel.

## 15. Trial & pricing
- Trial: **20 days** from setup (`shops.trial_ends_at`). No paywall in V1, only a banner from day 15: "ट्रायल X दिवसांत संपेल".
- Price to be agreed **before** the trial starts. Working proposal: ₹1,500–2,500 one-time setup + ₹199/month, or ₹1,999/year. [CONFIRM after checking competitor tailor apps]

## 16. Open questions
1. Exact measurement fields and order per garment → from register photos.
2. Which sketch templates he draws most (blouse front/back? neck shapes?).
3. Does he write the order no. on a slip/tag for the customer? (If yes → printable/WhatsApp slip in V2.)
4. Customer address: needed or not? (Optional field for now.)
