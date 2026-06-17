-- ════════════════════════════════════════════════════════
--  قروب موس — توقعات كأس العالم 2026
--  مخطط قاعدة البيانات (Supabase / PostgreSQL)
--  انسخ هذا الملف كامل والصقه في Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════

-- جدول اللاعبين
create table if not exists players (
  id          bigint generated always as identity primary key,
  name        text not null unique,          -- اسم اللاعب (فريد)
  pin_hash    text not null,                 -- الرقم السري (مخزّن مشفّر)
  is_admin    boolean default false,         -- هل هو الأدمن؟
  created_at  timestamptz default now()
);

-- جدول المباريات (يُملأ تلقائيًا من openfootball)
create table if not exists matches (
  id          bigint primary key,            -- رقم المباراة الثابت
  matchday    text,                          -- الجولة (Matchday X)
  round_label text,                          -- وصف عربي للجولة
  team1       text not null,
  team2       text not null,
  team1_code  text,                          -- رمز/علم
  team2_code  text,
  grp         text,                          -- المجموعة
  kickoff     timestamptz not null,          -- وقت البداية (UTC)
  score1      int,                           -- نتيجة الفريق 1 (null = لم تنتهِ)
  score2      int,                           -- نتيجة الفريق 2
  status      text default 'scheduled',      -- scheduled | live | finished
  manual      boolean default false,         -- نتيجة أُدخلت يدويًا من الأدمن (لا تمسحها المزامنة)
  updated_at  timestamptz default now()
);

-- جدول التوقعات
create table if not exists predictions (
  id          bigint generated always as identity primary key,
  player_id   bigint not null references players(id) on delete cascade,
  match_id    bigint not null references matches(id) on delete cascade,
  pred1       int not null,                  -- توقع نتيجة الفريق 1
  pred2       int not null,                  -- توقع نتيجة الفريق 2
  is_double   boolean default false,         -- هل هي مباراة الدبل؟
  points      int default 0,                 -- النقاط المحسوبة لهذا التوقع
  scored      boolean default false,         -- هل حُسبت؟
  updated_at  timestamptz default now(),
  unique (player_id, match_id)               -- توقع واحد لكل لاعب لكل مباراة
);

-- فهارس للسرعة
create index if not exists idx_pred_player on predictions(player_id);
create index if not exists idx_pred_match  on predictions(match_id);
create index if not exists idx_match_kick  on matches(kickoff);

-- ════════════════════════════════════════════════════════
--  دالة الترتيب: تجمع نقاط كل لاعب وترتّبهم
-- ════════════════════════════════════════════════════════
create or replace view leaderboard as
select
  p.id,
  p.name,
  coalesce(sum(pr.points), 0) as total_points,
  count(pr.id) filter (where pr.scored)            as games_scored,
  count(pr.id) filter (where pr.points > 0)        as correct_preds
from players p
left join predictions pr on pr.player_id = p.id
group by p.id, p.name
order by total_points desc, correct_preds desc;

-- ════════════════════════════════════════════════════════
--  دالة الإحصائيات: نتائج دقيقة صحيحة + توقعات فائز صحيحة
-- ════════════════════════════════════════════════════════
create or replace view stats as
select
  p.id,
  p.name,
  count(*) filter (where m.status = 'finished' and pr.pred1 = m.score1 and pr.pred2 = m.score2)                  as exact_count,
  count(*) filter (where m.status = 'finished' and sign(pr.pred1 - pr.pred2) = sign(m.score1 - m.score2))        as outcome_count,
  coalesce(sum(pr.points), 0)                                                                                    as total_points
from players p
left join predictions pr on pr.player_id = p.id
left join matches m on m.id = pr.match_id
group by p.id, p.name
order by exact_count desc, outcome_count desc;

-- ════════════════════════════════════════════════════════
--  أمان مستوى الصف (RLS)
--  ملاحظة: التطبيق يتعامل مع المصادقة عبر الـ API،
--  والمفتاح السري (service key) يُستخدم في الخادم فقط.
-- ════════════════════════════════════════════════════════
alter table players     enable row level security;
alter table matches     enable row level security;
alter table predictions enable row level security;

-- القراءة العامة للمباريات والترتيب مسموحة (بيانات غير حساسة)
create policy "matches public read"     on matches     for select using (true);

-- جداول اللاعبين والتوقعات: الوصول عبر الخادم فقط (service role)
-- لا نضيف سياسات public؛ الافتراضي يمنع الوصول المباشر من المتصفح.

-- ════════════════════════════════════════════════════════
--  إشعارات Web Push (التذكير بالتوقع)
-- ════════════════════════════════════════════════════════
create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  player_id   bigint not null references players(id) on delete cascade,
  endpoint    text not null unique,          -- عنوان دفع المتصفح (فريد)
  p256dh      text not null,
  auth        text not null,
  updated_at  timestamptz default now()
);
create index if not exists idx_push_player on push_subscriptions(player_id);

-- سجل الإرسال — منع تكرار تذكير نفس اللاعب لنفس المباراة
create table if not exists push_log (
  player_id  bigint not null references players(id) on delete cascade,
  match_id   bigint not null references matches(id) on delete cascade,
  sent_at    timestamptz default now(),
  primary key (player_id, match_id)
);

-- ════════════════════════════════════════════════════════
--  تتبّع دخول اللاعبين (تطبيق/متصفح + آخر دخول + العدد)
-- ════════════════════════════════════════════════════════
alter table players add column if not exists last_open timestamptz;
alter table players add column if not exists last_mode text;       -- 'app' | 'browser'
alter table players add column if not exists platform text;        -- iPhone | Android | كمبيوتر
alter table players add column if not exists installed boolean default false;
alter table players add column if not exists opens int default 0;
