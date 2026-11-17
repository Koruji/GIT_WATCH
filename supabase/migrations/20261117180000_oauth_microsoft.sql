-- =============================================================================
-- GitWatch — connexion OAuth (Microsoft / provider `azure`)
-- 1. handle_new_user : lit aussi `full_name` / `name` (fournis par les providers OAuth,
--    qui n'envoient pas `display_name` ni `workspace_name`).
-- 2. Les admins du tenant peuvent renommer leur espace de travail (colonne `name` seulement),
--    utile car un compte OAuth reçoit « Espace de <nom> » par défaut.
-- Idempotente : peut être rejouée sans erreur.
-- =============================================================================

-- ---------- 1. Inscription : prise en charge des métadonnées OAuth -----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name      text := coalesce(
                        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
                        split_part(new.email, '@', 1)
                      );
  v_workspace text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), ''), 'Espace de ' || v_name);
  v_tenant    uuid;
begin
  insert into public.profiles (id, display_name) values (new.id, v_name);

  -- 1 compte = 1 tenant, dont l'utilisateur est propriétaire.
  insert into public.tenants (name) values (v_workspace) returning id into v_tenant;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_tenant, new.id, 'owner');

  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

-- ---------- 2. Renommer son espace de travail --------------------------------
-- Droit explicite, limité à la colonne `name` (comme pour repositories.active).
grant update (name) on public.tenants to authenticated;

drop policy if exists "membres : renommer le tenant (admins)" on public.tenants;
create policy "membres : renommer le tenant (admins)" on public.tenants
  for update to authenticated
  using (public.is_tenant_admin(id)) with check (public.is_tenant_admin(id));
