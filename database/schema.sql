CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    grade INTEGER,
    city VARCHAR(120) NOT NULL DEFAULT '',
    timezone_name VARCHAR(80) NOT NULL DEFAULT 'Asia/Novosibirsk',
    lesson_price_rub NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_users_login ON users(login);
CREATE INDEX ix_users_role ON users(role);

CREATE TABLE demo_requests (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    grade INTEGER NOT NULL,
    contact VARCHAR(180) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE recurring_schedules (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(30) NOT NULL,
    topic VARCHAR(180) NOT NULL DEFAULT '',
    weekday INTEGER NOT NULL,
    local_time VARCHAR(5) NOT NULL,
    timezone_name VARCHAR(80) NOT NULL DEFAULT 'Asia/Novosibirsk',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    meeting_link VARCHAR(500) NOT NULL DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_recurring_schedules_student_id ON recurring_schedules(student_id);
CREATE INDEX ix_recurring_schedules_weekday ON recurring_schedules(weekday);
CREATE INDEX ix_recurring_schedules_is_active ON recurring_schedules(is_active);

CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(30) NOT NULL,
    topic VARCHAR(180) NOT NULL DEFAULT '',
    start_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    meeting_link VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    price_rub NUMERIC(10,2) NOT NULL DEFAULT 0,
    recurring_schedule_id INTEGER REFERENCES recurring_schedules(id) ON DELETE SET NULL,
    original_start_at TIMESTAMPTZ,
    transfer_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_lessons_student_id ON lessons(student_id);
CREATE INDEX ix_lessons_start_at ON lessons(start_at);
CREATE INDEX ix_lessons_status ON lessons(status);
CREATE INDEX ix_lessons_recurring_schedule_id ON lessons(recurring_schedule_id);
CREATE INDEX ix_lessons_original_start_at ON lessons(original_start_at);

CREATE TABLE transfer_requests (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    requested_start_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    tutor_comment TEXT NOT NULL DEFAULT '',
    external_url VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE homework (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'assigned',
    tutor_comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE homework_submissions (
    id SERIAL PRIMARY KEY,
    homework_id INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL DEFAULT '',
    external_url VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_assets (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(180) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    storage_backend VARCHAR(20) NOT NULL DEFAULT 'local',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE homework_attachments (
    id SERIAL PRIMARY KEY,
    homework_id INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE
);

CREATE TABLE submission_attachments (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE
);

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    audience_type VARCHAR(20) NOT NULL,
    grade INTEGER,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES file_assets(id) ON DELETE SET NULL,
    external_url VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    link VARCHAR(500) NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    dedupe_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_notifications_user_id ON notifications(user_id);
CREATE INDEX ix_notifications_is_read ON notifications(is_read);


CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent VARCHAR(500) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX ix_push_subscriptions_is_active ON push_subscriptions(is_active);
