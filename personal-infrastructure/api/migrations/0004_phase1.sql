-- environment: 환경 하나 = 프로젝트 하나. group 으로 묶고 (group, environment) 가 유일하다
alter table project add column group_name text;
update project set group_name = name;
alter table project alter column group_name set not null;
alter table project add column environment text not null default 'production';
create unique index project_group_environment_idx on project (group_name, environment) where deleted_at is null;

-- resource limits: 한 박스를 여러 앱이 나눠 쓴다
alter table project add column cpus real;
alter table project add column memory_mb integer;

-- env: 값은 전부 age 봉인. secret 이면 목록에서 마스킹
create table project_env (
    project_id uuid        not null references project (id) on delete cascade,
    key        text        not null,
    value      text        not null,
    secret     boolean     not null default false,
    updated_at timestamptz not null default now(),
    primary key (project_id, key)
);

alter table project add column env_updated_at timestamptz;

-- commit drift: 배포된 커밋을 박제해 원격 HEAD 와 대조한다
alter table deployment add column commit text;
