-- token ---------------------------------------------------------------------

create table token (
    id           uuid        primary key,
    name         text        not null unique,
    secret_hash  text        not null,
    scopes       text[]      not null,
    source       text        not null,
    created_at   timestamptz not null default now(),
    last_used_at timestamptz,
    revoked_at   timestamptz
);

create index token_secret_hash_idx on token (secret_hash) where revoked_at is null;


-- project -------------------------------------------------------------------

create table project (
    id          uuid        primary key,
    name        text        not null,
    source_kind text        not null,
    source_ref  text        not null,
    stack       text,
    port        integer,
    status      text        not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz
);

create unique index project_name_idx on project (name) where deleted_at is null;


-- deployment ----------------------------------------------------------------

create table deployment (
    id           uuid        primary key,
    project_id   uuid        not null references project (id) on delete cascade,
    status       text        not null,
    trigger      text        not null,
    stack        text,
    image_ref    text,
    container_id text,
    host_port    integer,
    error        text,
    created_at   timestamptz not null default now(),
    started_at   timestamptz,
    finished_at  timestamptz
);

create index deployment_project_idx on deployment (project_id, created_at desc);


-- deployment log ------------------------------------------------------------

create table deployment_log (
    id            bigserial   primary key,
    deployment_id uuid        not null references deployment (id) on delete cascade,
    stream        text        not null,
    line          text        not null,
    created_at    timestamptz not null default now()
);

create index deployment_log_idx on deployment_log (deployment_id, id);


-- job -----------------------------------------------------------------------

create table job (
    id         uuid        primary key,
    kind       text        not null,
    target_id  uuid        not null,
    status     text        not null,
    attempts   integer     not null default 0,
    error      text,
    claimed_at timestamptz,
    created_at timestamptz not null default now()
);

create index job_claim_idx on job (kind, status, created_at);


-- host port claim -----------------------------------------------------------

create table host_port_claim (
    port       integer     primary key,
    project_id uuid        references project (id) on delete cascade,
    reason     text        not null,
    created_at timestamptz not null default now()
);
