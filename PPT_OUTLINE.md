# Mazy Admin — Туршилтийн үр дүн (PPT)

> Слайд бүр нь PPT-н нэг хуудас. Шууд copy-paste хийж болохуйц богино тэмдэглэлүүд.

---

## Слайд 1 — Гарчиг

**Mazy Admin · Туршилтын самбар**
Дипломын ажил · 2026
Эрдэмсайхан · Гэрэл сэдвийн микро-сургалт

---

## Слайд 2 — Зорилго

**Юунд зориулагдсан вэ?**
- 3 өдрийн ашиглалтын тестийн өгөгдлийг **бодит цагаар цуглуулах**
- Сурагчдын зан төлвийг **screen-by-screen** хэмжих
- SUS, Quiz, Survey хариултуудыг **нэг газар** нэгтгэх

**Хэн харах вэ?**
- Зөвхөн судлаач (би) — login-тэй
- Сурагч өөрсдийн өгөгдлөө харахгүй

---

## Слайд 3 — Архитектур

```
[Mazy app]  ──insert──▶  [Supabase]  ──select──▶  [Mazy Admin]
   ↑                          ↑                        ↑
оролцогч                  нэг л DB                судлаач
```

- **Хоёр Next.js project** · нэг Supabase
- Анхдагч insert (анон) · уншилт (анон, read-only RLS)
- ~2,000 мөр код, 10 хүснэгт, 4 view

---

## Слайд 4 — Schema-ийн критик засвар

**Олдсон асуудал:** Mazy app `screen_views.client_uid + screen_slug`-ыг бичсэн боловч schema-д `user_id (uuid FK)` байсан → бүх insert чимээгүй унаж байсан.

**Засвар:** `schema_v4_align.sql`
- `screen_views`, `quiz_answers`-ийг **дахин үүсгэсэн**
- `users.grade`-ийг nullable болгосон
- Anon SELECT policy нэмж dashboard уншиж чадахаар болгосон

→ **Дараах өдрөөс өгөгдөл хадгалагдаж эхэлсэн**

---

## Слайд 5 — Дашбоардын нүүр (5 stat card)

| Метрик | Эх сурвалж |
|---|---|
| Нийт оролцогч | `users` count |
| Хичээл дуусгасан | distinct `client_uid` (`screen_slug = 'done'`) |
| **Дундаж SUS оноо** | events → SUS томьёо (Brooke 1996) |
| Дундаж бодолтын хугацаа | `quiz_answers.time_to_answer_ms` |
| Лаб дахь хугацаа | `screen_views` (lab_*, lesson_lab_*) |

---

## Слайд 6 — Completion Funnel · 11 алхам

Mazy app-ын **бодит дэлгэцэн дараалал**:

`home → lessons → lesson_intro → motion_player → lab → lesson_practice → lesson_distill → quiz → lesson_complete → done → survey`

→ Алхам тус бүр дээр **distinct user count**
→ Drop-off хувийг шууд chart дээр харуулна
→ Дипломд "хүүхдүүд хаана зогссон вэ?" гэдгийг визуалаар тайлбарлах

---

## Слайд 7 — 4 Фазын дамжилт (хичээл бүрд)

**Phase 1 Lab** → **Phase 2 Distill** → **Phase 3 Practice** → **Phase 4 Quiz**

| Хичээл | Лаб | Хураангуй | Дасгал | Сорилт |
|---|---|---|---|---|
| reflection | 7 | 6 | 5 | 5 |
| refraction | 6 | 5 | 4 | 4 |
| ... | | | | |

→ "Teaching before testing" pedagogy-ийн drop-off шинжилгээ

---

## Слайд 8 — SUS оноо (Brooke 1996)

```
SUS = ( Σ сондгой_i (score − 1) + Σ тэгш_i (5 − score) ) × 2.5
```

- 10 асуултын **бүгд** ирсэн үед л оноо тооцно
- Босго: **≥ 68** = "Acceptable" (Bangor et al. 2009)
- Дашбоарт: ≥68 → **🟢 ногоон чип**, доор → 🟡 шар чип

→ Mazy app-аас `events` хүснэгт рүү `sus_response` гэж бичигдэнэ

---

## Слайд 9 — Оролцогчийн дэлгэрэнгүй (`/participant/[id]`)

5 хүснэгт нэг хуудсанд:

1. **screen_views** — slug, цаг, хугацаа
2. **quiz_answers** — асуулт, сонгосон, ✓/✗, бодолтын хугацаа
3. **SUS responses** — асуулт № 1–10 → 1–5
4. **practice_attempts** — drill, зөв/буруу, хугацаа
5. **Survey answers** — Q1–Q7, Likert bar, Q7 холбоо

→ Нэг хүний бүх оролцоо нэг screenshot-д

---

## Слайд 10 — Survey хариултын дүн

**Likert дундаж (n хариу, 1–5):**
- Q1 Хөдөлгөөнт график
- Q2 Дэлгэцийн цэвэр байдал
- Q3 Навигаци
- Q4 Өнгө
- Q5 Мазаалай + микро-сургалт

**+** Q6 чөлөөт санал (текст, ишлэл хэлбэрээр)
**+** Q7 "Дараагийн судалгаанд оролцох уу?" (consent + холбоо)

---

## Слайд 11 — Шинэ интерактив: PrismLab

**Зорилго:** Призмийн дисперс үзэгдлийг **drag-and-see** аргаар үзүүлэх

- Цагаан туяаг чирж тусах өнцгийг өөрчилнө
- Гарах талд **7 өнгийн солонго** автоматаар тархана
- Δn ≈ 0.04 (crown glass) — өнгө бүр ялгаатай хугарна
- 3 удаа өөр өнцгөөр оролдсон үед `lab_mastery` event илгээгдэнэ

→ Refraction Lab, Shadow Lab, Spherical Mirror Lab-ийн дараах **4 дэх** seed-quality lab

---

## Слайд 12 — Тоон үр дүн (туршилтын дараа бөглөнө)

| Метрик | Утга |
|---|---|
| Нийт оролцогч (n) | __ |
| Хичээл дуусгасан хувь | __ % |
| Дундаж SUS | __ (босго ≥ 68) |
| Q1..Q5 дундаж | __ / 5 |
| Quiz зөв хариулсан хувь | __ % |
| Дундаж лаб хугацаа | __ сек |

→ Screenshots-ийг диплом §4-д ишлэл болгож оруулах

---

## Слайд 13 — Дүгнэлт

**Юу хийсэн:**
- 9 SQL schema patch · бүгд idempotent
- 5 хуудас + 6 component-той admin app
- Real-time биш ч F5-р шинэчлэгдэнэ — 3 өдрийн тестэд хангалттай

**Хязгаарлалт:**
- n < 50 → SPSS-д stat test хязгаартай (Mann-Whitney хэрэглэх)
- Mobile-only mazy app · admin desktop-only

**Цаашид:**
- Service-role key + server-side query → production-grade RLS
- Heatmap, Sankey diagram (v2-д)

---

## Слайд 14 — Талархал

**Удирдагч:** [тэр хүний нэр]
**Туршилтанд оролцсон:** __ сурагч
**Технологи:** Next.js 16 · React 19 · Supabase · Recharts · Tailwind v4

→ Github (хэрэв нийтэлсэн бол) | Vercel deployment URL

---

## PPT-д ашиглах **хурдан screenshot жагсаалт**

1. **Архитектурийн схем** (Слайд 3) — диаграм
2. **Funnel chart** (Слайд 6) — admin home-н vertical bar
3. **4-фазын хүснэгт** (Слайд 7) — `Хичээл бүрийн фазын дамжилт`
4. **SUS чип** (Слайд 8) — ногоон/шар бүхий stat card
5. **Participant detail** (Слайд 9) — 5 хүснэгт нэг screenshot-д
6. **Survey Likert** (Слайд 10) — 5 stat card row
7. **PrismLab анимаци** (Слайд 11) — 3 өнцөг screenshot

---

> Энэ outline-ыг PPT-д хувирган засаж ашиглана уу. Слайд тус бүр **30–60 секундийн ярианд** тохируулсан богино.
