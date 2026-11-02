create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function preserve_evidence() returns trigger language plpgsql as $$ begin raise exception 'Evidence is append-only. Create a new population or review, never overwrite history.'; end $$;
create table engagements (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name))>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'), period_start date not null, period_end date not null,
 owner text not null check(length(trim(owner))>0), due_date date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(period_end>=period_start)
);
create table populations (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements,
 name text not null, source_file text not null, source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 mapping jsonb not null default '{}', expected_count integer check(expected_count>=0), expected_net numeric(18,2),
 imported_by text not null check(length(trim(imported_by))>0), row_count integer not null check(row_count>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(engagement_id,name)
);
create table entries (
 id uuid primary key default gen_random_uuid(), population_id uuid not null references populations,
 row_no integer not null check(row_no>0), record_id text not null, journal text not null default '',
 invoice text not null default '', vendor text not null default '', account text not null default '',
 entry_date date not null, amount numeric(18,2) not null, entered_by text not null default '', description text not null default '',
 raw jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(population_id,row_no)
);
create index entries_population on entries(population_id);
create table test_runs (
 id uuid primary key default gen_random_uuid(), population_id uuid not null references populations,
 test_name text not null, parameters jsonb not null, results jsonb not null check(jsonb_typeof(results)='array'),
 prepared_by text not null check(length(trim(prepared_by))>0), purpose text not null check(length(trim(purpose))>0),
 source_sha256 text not null, result_sha256 text not null, engine_version text not null,
 due_date date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table reviews (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references test_runs,
 reviewer text not null check(length(trim(reviewer))>0), conclusion text not null check(length(trim(conclusion))>0),
 evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function independent_review() returns trigger language plpgsql as $$ begin
 if lower(trim(new.reviewer))=(select lower(trim(prepared_by)) from test_runs where id=new.run_id) then
 raise exception 'Reviewer must differ from preparer (firm policy)'; end if; return new; end $$;
create trigger independent_review before insert on reviews for each row execute function independent_review();
create table notes (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements,
 actor text not null check(length(trim(actor))>0), body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['engagements','populations','entries','test_runs','reviews','notes'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['populations','entries','test_runs','reviews','notes'] loop
 execute format('create trigger preserve before update or delete on %I for each row execute function preserve_evidence()',t);
 end loop; end $$;
create view population_controls as
 select p.id,p.name,g.name engagement,g.currency,p.row_count,count(e.id)::integer actual_count,
 p.expected_count,p.expected_net,coalesce(sum(e.amount),0)::numeric(18,2) actual_net,
 (p.expected_count is not null and p.expected_net is not null and p.expected_count=count(e.id)
 and p.expected_net=coalesce(sum(e.amount),0)) reconciled,p.source_sha256,p.imported_by
 from populations p join engagements g on g.id=p.engagement_id left join entries e on e.population_id=p.id
 group by p.id,g.id;
create view review_queue as
 select r.id,g.name engagement,p.name population,r.test_name,r.prepared_by,r.due_date,
 jsonb_array_length(r.results) result_count,greatest(current_date-r.due_date,0) days_overdue,
 r.created_at from test_runs r join populations p on p.id=r.population_id join engagements g on g.id=p.engagement_id
 where not exists(select 1 from reviews v where v.run_id=r.id);
create view engagement_week as
 select g.id,g.name,g.currency,g.owner,g.due_date,
 (select count(*)::integer from populations p where p.engagement_id=g.id) populations,
 (select count(*)::integer from review_queue q where q.engagement=g.name) reviews_waiting
 from engagements g;
revoke all on population_controls,review_queue,engagement_week from public;
