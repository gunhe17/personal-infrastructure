-- setting -------------------------------------------------------------------

create table setting (
    key        text        primary key,
    value      jsonb       not null,
    updated_at timestamptz not null default now()
);


-- credential ----------------------------------------------------------------

create table credential (
    id         uuid        primary key,
    name       text        not null,
    kind       text        not null,
    secret     text        not null,
    created_at timestamptz not null default now()
);

create unique index credential_name_idx on credential (name);


-- domain --------------------------------------------------------------------

create table domain_name (
    id           uuid        primary key,
    project_id   uuid        not null references project (id) on delete cascade,
    host         text        not null,
    path_prefix  text        not null default '/',
    tls_mode     text        not null,
    status       text        not null,
    created_at   timestamptz not null default now()
);

create unique index domain_name_host_idx on domain_name (host, path_prefix);


-- certificate ---------------------------------------------------------------

create table certificate (
    id          uuid        primary key,
    host        text        not null,
    issuer      text        not null,
    cert_pem    text        not null,
    key_pem     text        not null,
    not_after   timestamptz not null,
    created_at  timestamptz not null default now()
);

create unique index certificate_host_idx on certificate (host);


-- route rule ----------------------------------------------------------------

create table route_rule (
    id          uuid        primary key,
    domain_id   uuid        not null references domain_name (id) on delete cascade,
    path_prefix text        not null,
    action      text        not null,
    rate_limit  integer,
    created_at  timestamptz not null default now()
);


-- git / webhook -------------------------------------------------------------

create table git_link (
    project_id  uuid        primary key references project (id) on delete cascade,
    repository  text        not null,
    branch      text        not null default 'main',
    auto_deploy boolean     not null default true,
    secret      text        not null,
    created_at  timestamptz not null default now()
);

create table webhook (
    id         uuid        primary key,
    project_id uuid        references project (id) on delete cascade,
    event      text        not null,
    url        text        not null,
    secret     text,
    created_at timestamptz not null default now()
);

create table webhook_delivery (
    id         bigserial   primary key,
    webhook_id uuid        not null references webhook (id) on delete cascade,
    status     integer,
    error      text,
    created_at timestamptz not null default now()
);


-- managed database ----------------------------------------------------------

create table managed_database (
    id           uuid        primary key,
    name         text        not null,
    engine       text        not null,
    version      text        not null,
    host_port    integer     not null,
    username     text        not null,
    password     text        not null,
    database     text        not null,
    volume       text        not null,
    status       text        not null,
    created_at   timestamptz not null default now()
);

create unique index managed_database_name_idx on managed_database (name);


-- backup --------------------------------------------------------------------

create table backup_destination (
    id         uuid        primary key,
    name       text        not null,
    kind       text        not null,
    location   text        not null,
    created_at timestamptz not null default now()
);

create unique index backup_destination_name_idx on backup_destination (name);

create table backup (
    id             uuid        primary key,
    destination_id uuid        not null references backup_destination (id) on delete cascade,
    target_kind    text        not null,
    target_id      uuid,
    artifact       text,
    size_bytes     bigint,
    status         text        not null,
    error          text,
    created_at     timestamptz not null default now(),
    finished_at    timestamptz
);

create table backup_schedule (
    id             uuid        primary key,
    destination_id uuid        not null references backup_destination (id) on delete cascade,
    target_kind    text        not null,
    target_id      uuid,
    every_seconds  bigint      not null,
    last_run_at    timestamptz,
    created_at     timestamptz not null default now()
);


-- monitoring ----------------------------------------------------------------

create table incident (
    id         uuid        primary key,
    scope      text        not null,
    subject    text        not null,
    severity   text        not null,
    message    text        not null,
    opened_at  timestamptz not null default now(),
    closed_at  timestamptz
);

create unique index incident_open_idx on incident (scope, subject) where closed_at is null;


-- audit ---------------------------------------------------------------------

create table audit_entry (
    id         bigserial   primary key,
    token_id   uuid,
    source     text        not null,
    action     text        not null,
    created_at timestamptz not null default now()
);

create index audit_entry_idx on audit_entry (created_at desc);


-- notification --------------------------------------------------------------

create table notification_channel (
    id         uuid        primary key,
    name       text        not null,
    kind       text        not null,
    target     text        not null,
    created_at timestamptz not null default now()
);

create unique index notification_channel_name_idx on notification_channel (name);


-- storage -------------------------------------------------------------------

create table volume (
    id         uuid        primary key,
    project_id uuid        references project (id) on delete cascade,
    name       text        not null,
    mount_path text        not null,
    created_at timestamptz not null default now()
);

create unique index volume_name_idx on volume (name);
