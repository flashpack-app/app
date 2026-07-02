-- flash. minimal auth schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  invite_code   TEXT UNIQUE NOT NULL,
  invite_slots  INT  NOT NULL DEFAULT 3,
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  streak_days   INT  NOT NULL DEFAULT 0,
  city          TEXT NOT NULL DEFAULT 'istanbul',
  country       TEXT NOT NULL DEFAULT 'TR',
  flag          TEXT NOT NULL DEFAULT '🇹🇷',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genesis_codes (
  code     TEXT PRIMARY KEY,
  used     BOOLEAN NOT NULL DEFAULT FALSE,
  used_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

-- additive migrations (safe to re-run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_border TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_pong_badge BOOLEAN NOT NULL DEFAULT FALSE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
  ) THEN
    BEGIN
      ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      -- already added concurrently
      NULL;
    END;
  END IF;
END $$;

-- Photos posted by users
CREATE TABLE IF NOT EXISTS photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url     TEXT,
  filter        TEXT NOT NULL DEFAULT 'raw',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reverted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '18 hours'
);

-- Store the actual image bytes (base64) so all pack members can load them.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_mime TEXT;

-- flash.live 3-second silent video clip (Pro feature)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_data TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_mime TEXT;

-- Packs (groups of users who posted in same window)
CREATE TABLE IF NOT EXISTS packs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number        INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open', -- open, closed, saved
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '18 hours',
  chemistry_score INT NOT NULL DEFAULT 0
);

-- Which users are in which pack
CREATE TABLE IF NOT EXISTS pack_members (
  pack_id       UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id      UUID REFERENCES photos(id) ON DELETE SET NULL,
  city          TEXT,
  country       TEXT,
  flag          TEXT,
  has_posted    BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pack_id, user_id)
);

-- Reactions on packs (max 5 enforced in app)
CREATE TABLE IF NOT EXISTS pack_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, user_id)
);

-- Per-photo reactions (one emoji per user per photo)
CREATE TABLE IF NOT EXISTS photo_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_photo_reactions_photo ON photo_reactions(photo_id);

-- Comments on packs (one per user)
CREATE TABLE IF NOT EXISTS pack_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, user_id)
);

-- Reports against packs
CREATE TABLE IF NOT EXISTS pack_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending, resolved, dismissed
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_reports_status ON pack_reports(status);
CREATE INDEX IF NOT EXISTS idx_pack_reports_pack ON pack_reports(pack_id);

-- Reports against users
CREATE TABLE IF NOT EXISTS user_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_target ON user_reports(target_user_id);

-- Reports against comments
CREATE TABLE IF NOT EXISTS comment_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id    UUID NOT NULL REFERENCES pack_comments(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast
  type          TEXT NOT NULL DEFAULT 'system',  -- system, pack, comment, reaction, streak
  title         TEXT NOT NULL,
  body          TEXT,
  pack_id       UUID REFERENCES packs(id) ON DELETE SET NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at);
CREATE INDEX IF NOT EXISTS idx_packs_created ON packs(created_at);
CREATE INDEX IF NOT EXISTS idx_pack_members_user ON pack_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_reactions_pack ON pack_reactions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_comments_pack ON pack_comments(pack_id);

CREATE TABLE IF NOT EXISTS daily_topics (
  topic_date DATE PRIMARY KEY,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Screenshots taken within a pack (one row per user per pack)
CREATE TABLE IF NOT EXISTS pack_screenshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_screenshots_pack ON pack_screenshots(pack_id);

-- Moderation violations tracking
CREATE TABLE IF NOT EXISTS moderation_violations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL, -- banned_term, url_link, spam_pattern, image_rejected
  content_type  TEXT NOT NULL, -- text, image
  pack_id       UUID REFERENCES packs(id) ON DELETE SET NULL,
  comment_id    UUID REFERENCES pack_comments(id) ON DELETE SET NULL,
  photo_id      UUID REFERENCES photos(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_violations_user ON moderation_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_violations_created ON moderation_violations(created_at DESC);

-- Add violation count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMPTZ;
