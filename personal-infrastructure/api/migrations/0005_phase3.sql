-- route rule: allow 목록 (CIDR)
alter table route_rule add column cidrs text[] not null default '{}';

-- request stat: 엣지 access log 를 30초마다 집계. 요청당 DB 쓰기 없음
create table request_stat (
    bucket timestamptz not null,
    host   text        not null,
    status integer     not null,
    path   text        not null,
    count  integer     not null,
    primary key (bucket, host, status, path)
);

create index request_stat_bucket_idx on request_stat (bucket desc);
