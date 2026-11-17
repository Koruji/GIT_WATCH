-- =============================================================================
-- GitWatch — schéma initial (multi-tenant) + RLS + trigger d'inscription
-- À exécuter dans Supabase (SQL Editor) ou via `supabase db push`.
-- Règle d'or : un utilisateur ne voit QUE les données des tenants dont il est membre.
-- Les écritures sur events / analyses / repositories(création) passent par la
-- Gateway et N8N avec la clé service_role (qui contourne la RLS).
-- =============================================================================

-- ---------- Types ------------------------------------------------------------
create type public.member_role     as enum ('owner', 'admin', 'member');
create type public.event_type      as enum ('push', 'pull_request', 'branch_created');
create type public.event_category  as enum ('bug', 'feature', 'refactor', 'docs', 'chore');
create type public.urgency_level   as enum ('low', 'medium', 'high', 'critical');
create type public.analysis_status as enum ('pending', 'done', 'failed');
create type public.webhook_status  as enum ('ok', 'error', 'pending');

-- ---------- Tables -----------------------------------------------------------
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      public.member_role not null default 'member',
  primary key (tenant_id, user_id)
);

create table public.repositories (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  full_name      text not null,                       -- ex. acme/api-gateway
  default_branch text not null default 'main',
  active         boolean not null default true,
  webhook_status public.webhook_status not null default 'pending',
  created_at     timestamptz not null default now(),
  unique (tenant_id, full_name)
);

-- Secret du webhook GitHub : table à part, SANS aucune policy => illisible côté client.
create table public.repository_secrets (
  repository_id  uuid primary key references public.repositories (id) on delete cascade,
  webhook_secret text not null
);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  repository_id uuid not null references public.repositories (id) on delete cascade,
  event_type    public.event_type not null,
  ref           text not null,                        -- branche concernée
  author_login  text not null,
  title         text not null,
  url           text not null,
  delivery_id   text not null unique,                 -- X-GitHub-Delivery : idempotence
  commits_count integer,
  files_changed integer,
  additions     integer,
  deletions     integer,
  pr_number     integer,
  payload       jsonb,
  status        public.analysis_status not null default 'pending',
  received_at   timestamptz not null default now()
);

create table public.analyses (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null unique references public.events (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade, -- dénormalisé pour une RLS simple
  category   public.event_category not null,
  urgency    public.urgency_level not null,
  labels     text[] not null default '{}',
  summary    text not null,
  model      text not null,
  created_at timestamptz not null default now()
);

-- « Lu / non lu » est propre à chaque utilisateur, pas à l'événement.
create table public.event_reads (
  user_id  uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.user_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  theme                 text not null default 'system'      check (theme in ('light', 'dark', 'system')),
  density               text not null default 'comfortable' check (density in ('comfortable', 'compact')),
  language              text not null default 'fr'          check (language in ('fr', 'en')),
  email_notifications   boolean not null default true,
  notify_min_urgency    public.urgency_level not null default 'high',
  auto_refresh_seconds  integer not null default 0          check (auto_refresh_seconds in (0, 30, 60, 300)),
  unread_only_by_default boolean not null default false
);

-- ---------- Index ------------------------------------------------------------
create index on public.tenant_members (user_id);
create index on public.repositories   (tenant_id);
create index on public.events         (tenant_id, received_at desc);
create index on public.events         (repository_id);
create index on public.analyses       (tenant_id);

-- ---------- Fonctions d'appartenance (utilisées par les policies) ------------
-- SECURITY DEFINER : évite la récursion de RLS sur tenant_members.
create or replace function public.is_tenant_member(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = t and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_tenant_admin(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = t and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

-- ---------- Row Level Security -----------------------------------------------
alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.tenant_members     enable row level security;
alter table public.repositories       enable row level security;
alter table public.repository_secrets enable row level security; -- aucune policy : accès service_role uniquement
alter table public.events             enable row level security;
alter table public.analyses           enable row level security;
alter table public.event_reads        enable row level security;
alter table public.user_settings      enable row level security;

create policy "membres : lecture du tenant" on public.tenants
  for select to authenticated using (public.is_tenant_member(id));

create policy "profil : lecture du sien" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profil : modification du sien" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "membres : lecture des membres de ses tenants" on public.tenant_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_tenant_member(tenant_id));

create policy "dépôts : lecture par les membres" on public.repositories
  for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "dépôts : modification par les admins" on public.repositories
  for update to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "événements : lecture par les membres" on public.events
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy "analyses : lecture par les membres" on public.analyses
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy "lectures : les siennes" on public.event_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "lectures : marquer lu (événement de son tenant)" on public.event_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_tenant_member(e.tenant_id)
    )
  );
create policy "lectures : marquer non lu" on public.event_reads
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "réglages : les siens" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Privilèges (explicites, indépendants du réglage Supabase) --------
-- Fonctionne que « Automatically expose new tables » soit coché ou non :
-- on repart de zéro puis on accorde uniquement ce qui est nécessaire.
revoke all on all tables in schema public from anon, authenticated;

grant all    on all tables in schema public to service_role;        -- Gateway / N8N
grant select on all tables in schema public to authenticated;       -- lecture (filtrée par la RLS)

revoke select on public.repository_secrets from authenticated;      -- secrets : service_role uniquement

grant insert, delete on public.event_reads    to authenticated;     -- marquer lu / non lu
grant insert, update, delete on public.user_settings to authenticated;
grant update (active)       on public.repositories to authenticated; -- seul « surveillé » est modifiable
grant update (display_name) on public.profiles     to authenticated;

-- ---------- Inscription : profil + tenant (espace de travail) + réglages -----
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name      text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  v_workspace text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), ''), 'Espace de ' || v_name);
  v_tenant    uuid;
begin
  insert into public.profiles (id, display_name) values (new.id, v_name);

  -- Modèle SaaS : 1 compte = 1 tenant (l'espace de travail), dont l'utilisateur est propriétaire.
  -- Le nom vient du formulaire d'inscription (options.data.workspace_name côté supabase-js).
  insert into public.tenants (name) values (v_workspace) returning id into v_tenant;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_tenant, new.id, 'owner');

  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Temps réel -------------------------------------------------------
-- Realtime applique la RLS : un client ne reçoit que les lignes qu'il a le droit de lire.
alter publication supabase_realtime add table public.events, public.analyses;
