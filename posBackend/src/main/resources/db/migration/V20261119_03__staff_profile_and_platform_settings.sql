CREATE TABLE IF NOT EXISTS staff_profiles (
    subject varchar(128) PRIMARY KEY,
    avatar_key varchar(512),
    avatar_content_type varchar(64),
    theme_preset varchar(32) NOT NULL DEFAULT 'apple'
        CHECK (theme_preset IN ('apple', 'executive', 'charcoal', 'emerald', 'sapphire', 'platinum')),
    theme_mode varchar(16) NOT NULL DEFAULT 'light'
        CHECK (theme_mode IN ('light', 'dark')),
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_settings (
    id smallint PRIMARY KEY CHECK (id = 1),
    default_theme_preset varchar(32) NOT NULL DEFAULT 'apple'
        CHECK (default_theme_preset IN ('apple', 'executive', 'charcoal', 'emerald', 'sapphire', 'platinum')),
    default_theme_mode varchar(16) NOT NULL DEFAULT 'light'
        CHECK (default_theme_mode IN ('light', 'dark')),
    updated_by varchar(128),
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
