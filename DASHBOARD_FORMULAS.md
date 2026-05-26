# Dashboard формула гарын авлага

Mazy Admin дашбордын бүх том картны тоо хаанаас, ямар томьёогоор гарч ирдгийг
энд тайлбарласан. Эх сурвалж нь Supabase-н хүснэгтүүд: `quiz_answers`,
`screen_views`, `observation_events`, `survey_responses`, `events`, `users`.

Файлын зураглал:
- Query логик нь `lib/queries.ts` дотор.
- UI рендер нь `app/page.tsx` дотор.

---

## 1. Quiz tab

### 1.1 Top dashboard — Mazy / Уламжлалт хос card

`ConditionStatCard` компонент. Өгөгдөл нь `getQuizQuestionStats()`-аар буцсан
`QuizQuestionStat[]`-ийг `lesson_id`-аар хуваан, дараах байдлаар нэгтгэнэ.

```
mazyQs   = quizStats.filter(q => q.lesson_id !== 'legacy')
legacyQs = quizStats.filter(q => q.lesson_id === 'legacy')
```

| Талбар | Томьёо | Тайлбар |
|---|---|---|
| **N асуулт** | `list.length` | (lesson_id, question_key) хослолын тоо |
| **Нийт оролдлого** | `Σ q.attempts` | Тухайн нөхцлийн `quiz_answers` row-ын тоо |
| **Зөв** | `Σ q.correct` | `is_correct = true` нийлбэр |
| **Буруу** | `Σ q.wrong` | `is_correct = false` нийлбэр |
| **Нарийвчлал** | `correct / attempts` | Хувиар (0–1 → %) |
| **Нийт бодсон** | `Σ (q.avg_time_ms × q.attempts)` | `quiz_answers.time_to_answer_ms`-н нийлбэр |
| **Дунд. бодолт** | `totalMs / attempts` | Нэг хариулт бүрд дунджаар |

Өнгөний шалгуур (Нарийвчлал): `≥70%` ногоон, `40–70%` амбер, `<40%` улаан.

`getQuizQuestionStats()` дотроо нэг асуулт болгоны group логик:
```
key = `${lesson_id}::${question_key}`
attempts += 1
if is_correct → correct += 1, else wrong += 1
time_total += time_to_answer_ms
selected_key хадгаль → option_dist[selected_key].count++
correct_key = selected_key of the FIRST row with is_correct=true (per key)
```

### 1.2 Per-lesson card

Хичээл тус бүрд:
- `lesson_accuracy = Σ correct / Σ attempts` (тэр хичээлд хамаарах асуултын)
- Per-question accuracy = `q.correct / q.attempts`
- Option distribution = тус option-ыг сонгосон тоо

### 1.3 Хуучин дасгал (Phase 3 practice drills)

Өгөгдөл: `getPracticeDrillSummary()` → `v_practice_drill_summary` view.
Эх сурвалж: `practice_attempts` хүснэгт.

```
totalAttempts = Σ d.attempts
totalCorrect  = Σ d.avg_correct × d.attempts
totalWrong    = Σ d.avg_wrong   × d.attempts
overallAcc    = totalCorrect / (totalCorrect + totalWrong)
totalMs       = Σ d.avg_duration_ms × d.attempts
avgMs         = totalMs / totalAttempts
```

Per-drill нарийвчлал:
```
drillAcc = (avg_correct × attempts) / (avg_correct × attempts + avg_wrong × attempts)
        = avg_correct / (avg_correct + avg_wrong)
```

---

## 2. Ажиглалт tab

Эх өгөгдөл: `fetchAllObservationEvents()` → `observation_events` хүснэгт.

Тус хүснэгт нь оролцогч бүрийн дэлгэрэнгүйд орж судлаачийн гар аргаар бүртгэсэн
event-уудыг хадгална: 6 төрөл (`hesitation`, `misclick`, `frustration`,
`positive`, `behavioral`, `vocal`), 1–5 severity scale, condition нь `Mazy`
эсвэл `Legacy`.

### 2.1 Verdict banner — 🏆 ялалтын тооцоо

3 шалгуураар очко тоологдоно:
```
winScore = { m: 0, l: 0 }

# 1. Severity дундаж: бага сайн
if meanSev_mazy < meanSev_legacy:  winScore.m++
elif meanSev_mazy > meanSev_legacy:  winScore.l++

# 2. Эерэг харьцаа: өндөр сайн
if sentiment_mazy > sentiment_legacy:  winScore.m++
elif sentiment_mazy < sentiment_legacy:  winScore.l++

# 3. Hesitation тоо: бага сайн
if hesitation_count_mazy < hesitation_count_legacy:  winScore.m++
elif hesitation_count_mazy > hesitation_count_legacy:  winScore.l++

winner = m > l ? 'mazy' : l > m ? 'legacy' : 'tie'
```

### 2.2 ObsConditionCard (Mazy/Уламжлалт)

| Талбар | Томьёо |
|---|---|
| **N event** | `list.length` (тухайн condition-ы row тоо) |
| **N session** | `unique(participant_id)` |
| **Дунд. severity** | `mean(severity)` — severity null биш rows |
| **Эерэг харьцаа** | `positive / (positive + frustration·set)` |
| **Per event type** | `count(event_type == k)` |

Где `frustration·set = { hesitation, misclick, frustration, behavioral }`.
Severity өнгө: `≤2` ногоон, `2–3.5` амбер, `>3.5` улаан.

### 2.3 "Гол үр дүн · энгийн үгээр" мөрүүд

| Мөр | Ялагч |
|---|---|
| 🤔 Хэн илүү бухимдсан? | meanSev бага байгаа condition |
| 😊 Хэн илүү эерэгээр хариулсан? | sentiment харьцаа өндөр |
| 🧠 Хэн дээр илүү ойлгомжтой? | hesitation тоо бага |
| 👥 Хэдэн оролцогчийн өгөгдөл? | (мэдээллийн мөр, ялалт байхгүй) |

### 2.4 Event төрлийн bar chart

Bar урт нь `count / max(mazy_count, legacy_count)` хувиар нормчлогдсон.
Тиймээс уртын зөрүү шууд харьцангуй давтамжийг харуулна.

---

## 3. Санал асуулга tab

### 3.1 Шинэ асуулга (L1–L7 + B1–B3)

Эх өгөгдөл: `getLikertResponses()` + `getLikertMeans()` →
`survey_responses` WHERE `variant IS NOT NULL` (variant = 'mazy' | 'legacy').
Deduplication: нэг хэрэглэгчийн нэг variant хариултын **хамгийн сүүлийн** мөр.

#### LikertConditionCard

```
L1–L6 сэтгэл ханамж = mean(L1, L2, L3, L4, L5, L6) per condition
L7 ачаалал           = L7 mean per condition
```

Өнгө (сэтгэл ханамж): `≥4` ногоон, `3–4` саарал, `<3` улаан.
Өнгө (ачаалал, L7, ↓): `≤2.5` ногоон, `2.5–4` саарал, `>4` улаан.

#### Within-subject strip

```
both    = count of user_id_client with BOTH variant='mazy' AND variant='legacy'
onlyM   = count with only 'mazy'
onlyL   = count with only 'legacy'
Δ ханамж = mazyL1L6Mean - legacyL1L6Mean
```

### 3.2 Хуучин асуулга (Q1–Q7 post-session)

Эх өгөгдөл: `getSurveyResponses()` + `getSurveyMeans()` →
`survey_responses` WHERE `variant IS NULL`. Deduplication: нэг хэрэглэгчийн
хамгийн сүүлийн нэг row.

#### Hero dashboard cards

```
Нийт хариу         = surveyMeans.n_responses
Q1–Q5 ерөнхий ханамж = mean(Q1, Q2, Q3, Q4, Q5 means)
Q7 consent rate     = q7Yes / (q7Yes + q7No)
  where q7Yes = count rows with answers.q7_consent.consent == 'yes'
        q7No  = count rows with answers.q7_consent.consent in ('no', other non-empty)
Q6 written count   = count rows with non-empty answers.q6_open_feedback
```

#### 🏆 / ⚠ Top/Bottom Q

```
ranked = [{ Q1: q1_mean }, { Q2: q2_mean }, ... { Q5: q5_mean }]
top    = argmax(v) over ranked
bottom = argmin(v) over ranked
```

---

## 4. Хяналт tab (нэмэлт)

### 4.1 Хэрэглэгчдийн ангилал (Mazy/Уламжлалт/Хоёулаа/Эхлээгүй)

Per-user flags (`getParticipants()`-аар тооцогдоно):
```
has_mazy   = ∃ screen_view WHERE slug starts with lesson_, quiz:, lab:, motion_player:
has_legacy = ∃ screen_view WHERE slug starts with legacy:
          OR ∃ event WHERE event='legacy_completed'
          OR ∃ survey_responses WHERE variant='legacy'
```

```
mazyOnly   = participants where has_mazy && !has_legacy
legacyOnly = !has_mazy && has_legacy
both       = has_mazy && has_legacy
neither    = !has_mazy && !has_legacy
```

### 4.2 Танилцах · унших хугацаа (Mazy vs Уламжлалт)

`getTimingComparison()`-аас quiz хасагдсан хугацааг тоолно.

```
per user:
  mazyRead   = intro_ms + video_ms + lab_ms + practice_ms     (quiz хасагдсан)
  legacyRead = topic1_ms + topic2_ms + topic3_ms + topic4_ms  (quiz, complete хасагдсан)

across users (mazyRead > 0):
  mazyMean   = mean(mazyRead)
  mazyMedian = median(mazyRead)
across users (legacyRead > 0):
  legacyMean   = mean(legacyRead)
  legacyMedian = median(legacyRead)

Δ = mazyMean - legacyMean
```

Per-bucket source:
```
mazy_intro_ms     ← screen_slug startsWith 'lesson_intro:'
mazy_video_ms     ← screen_slug startsWith 'motion_player:'
mazy_lab_ms       ← screen_slug startsWith 'lab:' OR 'lesson_lab:'
mazy_practice_ms  ← screen_slug startsWith 'lesson_practice:'
mazy_quiz_ms      ← screen_slug startsWith 'quiz:'

legacy_topic{1-4}_ms ← screen_slug == 'legacy:topic-0N'
legacy_quiz_ms       ← screen_slug == 'legacy:quiz'
legacy_complete_ms   ← screen_slug == 'legacy:complete'
```

Бусад Mazy дэлгэц (`lesson_distill`, `lesson_complete`, `lesson_play`) нь
"mazy_extra" буферт нэмэгдээд нийт Mazy total-д орно (per-screen breakdown-д
харагдахгүй).

---

## 5. Verdict tab (`/verdict`)

`getOverallVerdict()`. Шалгуур бүрд "хэн илүү сайн" гэдгийг тоолж winner-ыг
сонгоно.

| Шалгуур | Hypothesis | "Сайн" утга |
|---|---|---|
| L1–L6 (тус бүрд) | H4 | Өндөр сайн |
| L7 | H5 | Бага сайн ↓ |
| Quiz нарийвчлал | H1 | Өндөр сайн |
| Дундаж time-on-task | H1 | Бага сайн ↓ |

```
mazyWins   = count of metrics where Mazy better
legacyWins = count where Legacy better
ties       = count where equal
winner     = mazyWins > legacyWins ? 'mazy' : 'legacy' : 'tie'
```

Per-participant within-subject:
```
each user: for each metric where they have both Mazy & Legacy data
  if Mazy better → mazyScore++
  else if Legacy better → legacyScore++

decided = mazyScore > legacyScore ? 'mazy' : 'legacy' : 'tie'
```

---

## 6. Хадгалах/устгахад нөлөөлдөг logic

### 6.1 Орхиц (orphan) өгөгдлийг цэвэрлэх

Хэрэв admin-ийн `Trash` товчоор хэрэглэгч устгасан бол `deleteUserAction()` нь
дараах хүснэгтүүдээс `client_uid` (эсвэл `participant_id`) тулгаж бүгдийг
устгана:

- `screen_views.client_uid`
- `quiz_answers.client_uid`
- `events.user_id`
- `survey_responses.user_id_client`
- `practice_attempts.client_uid`
- `live_screen_sessions.client_uid`
- `observation_events.participant_id` (display_name + UID-slice fallback)

Хуучин устгасан хэрэглэгчдийн orphan мөр үлдсэн бол `WHERE client_uid NOT IN
(SELECT client_uid FROM users)` query-аар цэвэрлэнэ.

### 6.2 Observation event-ыг шууд DB-руу

`ObservationPopup` дотор add/delete хийсэн даруйд `observation_events`-руу
`upsert(onConflict: 'participant_id,condition,event_id')` хийгдэнэ. Session
нээх / condition сольсон үед `fetchObservationSession()`-аар DB-аас уншиж
LocalStorage-той `event_id`-аар merge хийнэ.

---

## 7. Үндсэн хүснэгтийн схем (ишлэл)

| Хүснэгт | Гол баганууд | Зориулалт |
|---|---|---|
| `users` | `id, client_uid, display_name, grade, knowledge_level, condition` | Оролцогчийн бүртгэл |
| `screen_views` | `client_uid, screen_slug, time_spent_ms` | Дэлгэц бүр дээрх цаг |
| `quiz_answers` | `client_uid, question_key, selected_key, is_correct, time_to_answer_ms, lesson_id` | Quiz хариулт |
| `events` | `user_id, event, meta jsonb` | Generic event log (track('legacy_completed', ...) гэх мэт) |
| `survey_responses` | `user_id_client, variant, answers jsonb` | Q1–Q7 болон L1–L7 |
| `practice_attempts` | `client_uid, lesson_id, drill_id, correct_count, wrong_count, duration_ms` | Phase 3 дасгал |
| `observation_events` | `participant_id, condition, event_id, event_type, severity, verbatim, notes` | Гар бүртгэсэн UX ажиглалт |

Бүх Likert/severity oneo нь **1–5** шкалатай. Цаг бүгд **миллисекунд** дотор
хадгалагдана; UI-д секунд буюу `Хмин Yс` болгож format хийнэ.
