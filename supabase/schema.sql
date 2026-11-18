-- Esegui tutto nello SQL Editor di Supabase (progetto nuovo).
-- Se avevi già eseguito la versione precedente, prima rimuovi le vecchie tabelle:
-- drop table if exists public.receipt_counters, public.recipients, public.associations, public.user_keys cascade;
-- drop function if exists public.reserve_receipt_numbers(uuid, int, int);
-- drop function if exists public.set_receipt_counter(uuid, int, int);
--
-- Modello: i contenuti (colonne "data", "wrapped_*") sono cifrati nel browser. In chiaro restano
-- ID, date tecniche, ruoli, email dei membri, anno e numero delle ricevute.

-- Chiavi personali: la chiave pubblica serve a "consegnarti" le chiavi delle associazioni;
-- la privata è cifrata con la tua password di cifratura.
create table public.user_keys (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email           text not null default lower(auth.jwt() ->> 'email'),
  salt            text not null,
  iterations      int  not null,
  public_key      text not null,
  wrapped_private text not null,
  created_at      timestamptz not null default now()
);

create table public.associations (
  id         uuid primary key default gen_random_uuid(),
  data       text not null,                      -- nome, indirizzo, C.F./P.IVA, logo, nota: cifrati
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Chi può lavorare su un'associazione; wrapped_dek = chiave dell'associazione cifrata per quell'utente
create table public.association_members (
  association_id uuid not null references public.associations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  email          text not null,
  role           text not null default 'member' check (role in ('owner', 'member')),
  wrapped_dek    text not null,
  created_at     timestamptz not null default now(),
  primary key (association_id, user_id)
);

create table public.recipients (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid not null references public.associations(id) on delete cascade,
  data           text not null,
  created_at     timestamptz not null default now()
);
create index recipients_association_idx on public.recipients (association_id);

create table public.receipt_counters (
  association_id uuid not null references public.associations(id) on delete cascade,
  year           int  not null,
  last_number    int  not null default 0,
  primary key (association_id, year)
);

-- Registro ricevute: numero e anno in chiaro, il resto cifrato. Non modificabile né cancellabile.
create table public.receipts (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid not null references public.associations(id) on delete cascade,
  year           int  not null,
  number         int  not null,
  issued_by      uuid default auth.uid() references auth.users(id) on delete set null,
  issued_at      timestamptz not null default now(),
  data           text not null,
  unique (association_id, year, number)
);

alter table public.user_keys           enable row level security;
alter table public.associations        enable row level security;
alter table public.association_members enable row level security;
alter table public.recipients          enable row level security;
alter table public.receipt_counters    enable row level security;
alter table public.receipts            enable row level security;

create or replace function public.is_member(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from association_members where association_id = a and user_id = auth.uid())
$$;
create or replace function public.is_owner(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from association_members where association_id = a and user_id = auth.uid() and role = 'owner')
$$;

-- Policy: i membri vedono i dati dell'associazione; solo il proprietario la modifica e gestisce i membri
create policy user_keys_select on public.user_keys for select to authenticated using (user_id = auth.uid());
create policy user_keys_insert on public.user_keys for insert to authenticated with check (user_id = auth.uid());

create policy associations_select on public.associations for select to authenticated using (public.is_member(id));
create policy associations_update on public.associations for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));
create policy associations_delete on public.associations for delete to authenticated using (public.is_owner(id));

create policy members_select on public.association_members for select to authenticated using (public.is_member(association_id));
create policy members_insert on public.association_members for insert to authenticated
  with check (public.is_owner(association_id) and role = 'member');
create policy members_delete on public.association_members for delete to authenticated
  using ((public.is_owner(association_id) or user_id = auth.uid()) and role <> 'owner');

create policy recipients_all on public.recipients for all to authenticated
  using (public.is_member(association_id)) with check (public.is_member(association_id));

create policy counters_select on public.receipt_counters for select to authenticated using (public.is_member(association_id));
create policy receipts_select on public.receipts for select to authenticated using (public.is_member(association_id));
-- nessuna policy di insert/update/delete su receipts e counters: si scrive solo con le funzioni qui sotto

-- Crea associazione + proprietario in un colpo solo
create or replace function public.create_association(p_data text, p_wrapped_dek text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non autorizzato'; end if;
  insert into associations (data, created_by) values (p_data, auth.uid()) returning id into v_id;
  insert into association_members (association_id, user_id, email, role, wrapped_dek)
  values (v_id, auth.uid(), lower(coalesce(auth.jwt() ->> 'email', '')), 'owner', p_wrapped_dek);
  return v_id;
end $$;

-- Cerca la chiave pubblica di una persona (serve ai proprietari per aggiungerla)
create or replace function public.find_user_key(p_email text)
returns table (user_id uuid, email text, public_key text)
language sql stable security definer set search_path = public as $$
  select k.user_id, k.email, k.public_key from user_keys k
  where k.email = lower(trim(p_email))
    and exists (select 1 from association_members m where m.user_id = auth.uid() and m.role = 'owner')
$$;

-- Assegna i numeri e registra le ricevute in un'unica operazione atomica:
-- niente doppioni anche con più persone al lavoro, niente buchi se il PDF fallisce.
create or replace function public.issue_receipts(p_association uuid, p_year int, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int; v_last int; v_first int;
begin
  if not public.is_member(p_association) then raise exception 'Non autorizzato'; end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 1000 then raise exception 'Quantità non valida'; end if;
  insert into receipt_counters as c (association_id, year, last_number)
  values (p_association, p_year, v_count)
  on conflict (association_id, year) do update set last_number = c.last_number + v_count
  returning c.last_number into v_last;
  v_first := v_last - v_count + 1;
  insert into receipts (association_id, year, number, issued_by, data)
  select p_association, p_year, (v_first + t.ord - 1)::int, auth.uid(), t.val
  from jsonb_array_elements_text(p_items) with ordinality as t(val, ord);
  return v_first;
end $$;

-- Imposta a mano l'ultimo numero (solo proprietario), mai sotto l'ultima ricevuta registrata
create or replace function public.set_receipt_counter(p_association uuid, p_year int, p_last int)
returns void language plpgsql security definer set search_path = public as $$
declare v_max int;
begin
  if not public.is_owner(p_association) then raise exception 'Solo il proprietario può cambiare la numerazione'; end if;
  select coalesce(max(number), 0) into v_max from receipts where association_id = p_association and year = p_year;
  if p_last < v_max then raise exception 'Esistono già ricevute fino al n. %', v_max; end if;
  insert into receipt_counters (association_id, year, last_number) values (p_association, p_year, p_last)
  on conflict (association_id, year) do update set last_number = excluded.last_number;
end $$;

revoke all on function public.is_member(uuid), public.is_owner(uuid),
  public.create_association(text, text), public.find_user_key(text),
  public.issue_receipts(uuid, int, jsonb), public.set_receipt_counter(uuid, int, int) from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid),
  public.create_association(text, text), public.find_user_key(text),
  public.issue_receipts(uuid, int, jsonb), public.set_receipt_counter(uuid, int, int) to authenticated;
