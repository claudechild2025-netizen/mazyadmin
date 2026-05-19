# MAZY ADMIN — MVP plan

> Salgah Next.js project. Зөвхөн та харна. Mazy student app-той ижил Supabase
> project-ыг уншина — schema нь өөрчлөгдөхгүй. Зөвхөн SELECT эрхтэй.

---

## 0. Setup (Antigravity-д өгөх анхны команд)

```bash
# 1. Шинэ project (Mazy student-аас тусдаа folder)
npx create-next-app@latest mazy-admin --typescript --tailwind --app --src-dir=false --import-alias="@/*" --eslint --no-turbopack
cd mazy-admin

# 2. Dependencies
npm install @supabase/supabase-js @supabase/ssr recharts lucide-react clsx
npm install -D @types/node

# 3. .env.local үүсгэх
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
ADMIN_EMAIL=YOUR-EMAIL@gmail.com
EOF

# 4. Файлуудыг хуулж байршуулах (энэ folder-оос):
#    app/page.tsx, app/login/page.tsx
#    components/StatCard.tsx, components/CompletionFunnel.tsx, components/ParticipantTable.tsx
#    lib/supabase.ts, lib/queries.ts, lib/csv.ts, middleware.ts
```

## 1. Authentication

Supabase Auth-ийн **magic link**. Та өөрийн email-ээ оруулсан хүн л нэвтэрнэ — өөр хэн ч нэвтэрсэн `middleware.ts`-д шууд буцаагдана.

**`.env.local`** дотор `ADMIN_EMAIL=...` гэж хадгалаад тэрхүү email-тэй тохирохгүй бол `/login` руу redirect хийнэ. Энэ нь thesis-grade security биш — **зөвхөн та нэвтэрнэ гэдгийг сурагчдад нуухад л хангалттай**.

## 2. MVP scope — юу build хийх вэ

**5 stat card** (нүүр хуудасны дээд хэсэг):

1. **Нийт оролцогч** — distinct `users.id`-ийн тоо
2. **Лесон дуусгасан** — `quiz_attempts.completed_at IS NOT NULL` тоо
3. **Дундаж SUS оноо** — `v_sus_scores`-аас. Хэрэв 68-аас дээш бол **ногоон чип** "Зөвшөөрөгдсөн", доор бол шар чип "Сайжруулах хэрэгтэй"
4. **Дундаж бодолтын хугацаа** (мс) — `quiz_answers.time_to_answer_ms`-ийн mean
5. **Лаб-д дундаж зарцуулсан хугацаа** — `screen_views WHERE screen_id LIKE 'lab_%'`-ийн `time_spent_ms` mean

**2 chart:**

6. **Completion funnel** (bar chart, vertical) — `home → lesson_intro → lab → quiz_q1 → quiz_q2 → quiz_q3 → complete → sus`-ийн алхам бүр дээр хэдэн оролцогч хүрсэн вэ? Хаана нь хүмүүс зогссон бэ гэдгийг харуулна.

7. **Quiz accuracy per question** (horizontal bar) — Q1/Q2/Q3 бүрд `% correct`. 50%-аас доош Quiz нь хэт хэцүү, 95%-аас дээш нь хэт амархан гэж дипломын ажилд тэмдэглэх.

**1 хүснэгт:**

8. **Оролцогчдын table** — нэг оролцогч = нэг мөр. Багана: ID (богино), Анги, Түвшин, Эхэлсэн цаг, Дууссан эсэх (✓/✗), Quiz score, SUS score, Лаб-д өнгөрсөн хугацаа, "Дэлгэрэнгүй" товч.

"Дэлгэрэнгүй" товч дарвал `app/participant/[id]/page.tsx` руу очно — энэ нь оролцогчийн screen_views, quiz_answers-ийн дэлгэрэнгүй жагсаалт. **MVP-д зориуд оруулах ч UI нь хэт олон chart-гүй, зөвхөн 3 хүснэгт.**

**1 товч:**

9. **CSV export** — нийт `participant table`-ийг csv хэлбэрээр татаж авах. SPSS, Python, Excel хаана ч ажиллана.

## 3. Юу хийхгүй вэ (MVP-аас гадуур)

- ❌ Real-time updates — F5 дээр refresh хийнэ
- ❌ Date range filter — бүх өгөгдөл харагдана
- ❌ Школ/анги хооронд харьцуулах — нэг л школ
- ❌ Heatmap, Sankey, эсвэл өндөр-fidelity chart
- ❌ Мобайл хариу — desktop-only
- ❌ Хэрэглэгчийг устгах функц — read-only
- ❌ Real-time push — нэг хэрэглэгч (та)

Эдгээрийг **v2-д үлдээж** шууд тестээ хийх боломжтой.

## 4. Файлын манифест

```
mazy-admin/
├── app/
│   ├── layout.tsx              ← миний бэлдсэн
│   ├── page.tsx                ← миний бэлдсэн (Dashboard)
│   ├── login/page.tsx          ← миний бэлдсэн
│   └── participant/[id]/page.tsx ← AI editor scaffold
├── components/
│   ├── StatCard.tsx            ← миний бэлдсэн
│   ├── CompletionFunnel.tsx    ← миний бэлдсэн (Recharts)
│   ├── QuizAccuracy.tsx        ← AI editor scaffold (CompletionFunnel-аас copy)
│   └── ParticipantTable.tsx    ← миний бэлдсэн
├── lib/
│   ├── supabase.ts             ← AI editor 5 мөр
│   ├── queries.ts              ← миний бэлдсэн (бүх SQL queries)
│   └── csv.ts                  ← миний бэлдсэн (export utility)
├── middleware.ts               ← миний бэлдсэн (auth guard)
├── .env.local                  ← AI editor: env var заасны дагуу
└── tailwind.config.ts          ← AI editor default + бага зэрэг өөрчлөх
```

## 5. Антигравитид өгөх deploy prompt (богино)

> "`mazy-admin` Next.js project-ыг setup-ыг §0-н дагуу хий. Уг folder-ийн файлуудыг үсэгчилэн хуул. Дараах 3 файлыг scaffold хий: (1) `app/participant/[id]/page.tsx` — `ParticipantTable.tsx`-н "Дэлгэрэнгүй" link нь үүн рүү очно; 1 stat card row + 3 хүснэгт (screen_views, quiz_answers, sus_responses). (2) `components/QuizAccuracy.tsx` — `CompletionFunnel.tsx`-аас бараг бүх юм copy, тоо тоо нь `lib/queries.ts`-ийн `getQuizAccuracy()`-аас унших ёстой. (3) `lib/supabase.ts` — энгийн `createBrowserClient` setup. `npm run build` амжилттай ажиллах хүртэл засвар хий. ADMIN_EMAIL-аа тохируулаагүй бол placeholder-аар ажиллана, гэхдээ deploy хийхээсээ өмнө realийг оруул."

## 6. Дипломын ажлын дүгнэлт-д ашиглах chart

Дашбоард-аас screenshot аваад дипломын **§4 (Үр дүн)**-д дараах байдлаар оруулах:

- **Бүлэг 4.1 — Хэрэглэгчийн оролцоо.** Stat card 1 + Completion funnel chart. "n=8 оролцогчоос 7 нь лесон дуусгасан, 1 нь quiz Q2-т зогссон…"
- **Бүлэг 4.2 — Хичээлийн үр дүн.** Quiz accuracy chart. "Дунджаар 73% зөв хариулт, Q3 хамгийн хэцүү байсан (62%)…"
- **Бүлэг 4.3 — Танин мэдэхүйн ачаалал.** Stat card 4 + 5. "Лаб-д дундаж 47 секунд зарцуулсан нь сурахын тулд хангалттай боловч хэт удсан биш…"
- **Бүлэг 4.4 — Нийт ашиглалтын үнэлгээ.** Stat card 3. "SUS нийт оноо 71.3, Bangor et al. (2009)-ийн `acceptable` босгоос (68) дээгүүр…"
- **Бүлэг 4.5 — Дэлгэрэнгүй хүснэгт.** Participant table-ийн screenshot. "Хүснэгт 1 — Оролцогч бүрийн дэлгэрэнгүй үр дүн…"

CSV export нь supplementary materials болж дипломын хавсралт орно.
