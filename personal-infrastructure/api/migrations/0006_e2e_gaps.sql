-- usage sample: docker stats 를 monitor 주기로 찍는다
create table usage_sample (
    sampled_at  timestamptz not null,
    container   text        not null,
    cpu_percent real        not null,
    mem_bytes   bigint      not null
);

create index usage_sample_at_idx on usage_sample (sampled_at desc);
