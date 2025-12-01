CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id            VARCHAR(80) PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id      VARCHAR(80) REFERENCES players(id) ON DELETE SET NULL,
    target_user_id VARCHAR(80) REFERENCES players(id) ON DELETE SET NULL,
    action        VARCHAR(64) NOT NULL,
    details       JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);
