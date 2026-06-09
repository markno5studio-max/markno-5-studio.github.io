-- ============================================================
--  馬克伍號影像工作室 — Supabase 資料庫結構 + 權限 + 函式
--  （這份取代舊的 firestore.rules）
--  用法：Supabase 主控台 → SQL Editor → 貼上整份 → Run
--  ⚠ 擁有者信箱 markno.5.studio@gmail.com 第一次用 Google 登入會自動成為 super_admin
-- ============================================================

-- ---------- 資料表 ----------
-- mk5_kv：網站內容。id = 'main' / 'private' / 'analytics' / 'secret'
create table if not exists public.mk5_kv (
  id   text primary key,
  data jsonb not null default '{}'::jsonb
);

-- admins：管理員 profile（uid 對應 Supabase Auth 的使用者 id）
create table if not exists public.admins (
  uid  uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- applications：待審核申請
create table if not exists public.applications (
  uid  uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- ---------- 權限判斷函式（security definer，避免 RLS 遞迴） ----------
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins where uid = auth.uid());
$$;

create or replace function public.is_super()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins where uid = auth.uid() and (data->>'role') = 'super_admin');
$$;

-- ---------- 開啟 RLS ----------
alter table public.mk5_kv       enable row level security;
alter table public.admins       enable row level security;
alter table public.applications enable row level security;

-- ---------- mk5_kv 權限 ----------
drop policy if exists mk5_kv_read         on public.mk5_kv;
drop policy if exists mk5_kv_analytics_ins on public.mk5_kv;
drop policy if exists mk5_kv_analytics_upd on public.mk5_kv;
drop policy if exists mk5_kv_main_ins     on public.mk5_kv;
drop policy if exists mk5_kv_main_upd     on public.mk5_kv;
drop policy if exists mk5_kv_secret_ins   on public.mk5_kv;
drop policy if exists mk5_kv_secret_upd   on public.mk5_kv;
drop policy if exists mk5_kv_del          on public.mk5_kv;

-- 讀取：main / analytics 公開；private 限管理員；secret 限超級管理員
create policy mk5_kv_read on public.mk5_kv for select using (
  id in ('main','analytics')
  or (id = 'private' and public.is_admin())
  or (id = 'secret'  and public.is_super())
);
-- analytics：任何人（含未登入訪客）可寫入瀏覽統計
create policy mk5_kv_analytics_ins on public.mk5_kv for insert with check (id = 'analytics');
create policy mk5_kv_analytics_upd on public.mk5_kv for update using (id = 'analytics') with check (id = 'analytics');
-- main / private：管理員可寫
create policy mk5_kv_main_ins on public.mk5_kv for insert with check (id in ('main','private') and public.is_admin());
create policy mk5_kv_main_upd on public.mk5_kv for update using (id in ('main','private') and public.is_admin()) with check (id in ('main','private') and public.is_admin());
-- secret（邀請碼）：超級管理員可寫
create policy mk5_kv_secret_ins on public.mk5_kv for insert with check (id = 'secret' and public.is_super());
create policy mk5_kv_secret_upd on public.mk5_kv for update using (id = 'secret' and public.is_super()) with check (id = 'secret' and public.is_super());
-- 刪除：管理員
create policy mk5_kv_del on public.mk5_kv for delete using (public.is_admin());

-- ---------- admins 權限 ----------
-- 寫入一律透過下方 security definer 函式（bootstrap_owner / redeem_invite / upsert_admin / approve_application）
drop policy if exists admins_read   on public.admins;
drop policy if exists admins_delete on public.admins;
create policy admins_read   on public.admins for select using (public.is_admin());
create policy admins_delete on public.admins for delete using (public.is_super());

-- ---------- applications 權限 ----------
drop policy if exists app_read on public.applications;
drop policy if exists app_ins  on public.applications;
drop policy if exists app_upd  on public.applications;
drop policy if exists app_del  on public.applications;
create policy app_read on public.applications for select using (uid = auth.uid() or public.is_admin());
create policy app_ins  on public.applications for insert with check (uid = auth.uid());
create policy app_upd  on public.applications for update using (uid = auth.uid()) with check (uid = auth.uid());
create policy app_del  on public.applications for delete using (public.is_admin());

-- ---------- 安全函式：帳號相關寫入 ----------
-- 擁有者第一次登入 → 自動建立 super_admin
create or replace function public.bootstrap_owner()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_email <> 'markno.5.studio@gmail.com' then raise exception 'not owner'; end if;
  insert into public.admins(uid, data) values (
    v_uid, jsonb_build_object('email',v_email,'name','超級執行長','role','super_admin',
      'permissions','[]'::jsonb,'avatar','','online',true,'lastSeen','')
  ) on conflict (uid) do nothing;
end; $$;

-- 邀請碼驗證 → 建立 editor
create or replace function public.redeem_invite(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := lower(coalesce(auth.jwt()->>'email','')); v_secret text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- 黑名單：被停權的 email 不得用邀請碼加入
  if coalesce((select (data->'blacklist') ? v_email from public.mk5_kv where id = 'secret'), false) then
    raise exception 'blacklisted';
  end if;
  select coalesce(data->>'inviteCode','') into v_secret from public.mk5_kv where id = 'secret';
  if coalesce(p_code,'') = '' or coalesce(v_secret,'') = '' or p_code <> v_secret then
    raise exception 'invalid invite code';
  end if;
  insert into public.admins(uid, data) values (
    v_uid, jsonb_build_object('email',v_email,'name',split_part(v_email,'@',1),'role','editor',
      'permissions','[]'::jsonb,'avatar','','online',true,'lastSeen','')
  ) on conflict (uid) do update set data = public.admins.data || excluded.data;
  delete from public.applications where uid = v_uid;
end; $$;

-- 取得邀請碼：開放給「任何已登入者」（含待審核申請者）讀取，但匿名訪客讀不到。
-- 用途：新帳號申請後，自動把邀請碼寄進歡迎信。RLS 仍擋住匿名爬取（未登入無法呼叫）。
create or replace function public.get_invite_code()
returns text language sql security definer set search_path = public as $$
  select case
    when auth.uid() is null then ''
    else coalesce((select data->>'inviteCode' from public.mk5_kv where id = 'secret'), '')
  end;
$$;

-- ---------- 黑名單（禁止登入）----------
-- 黑名單以「小寫 email 陣列」存在 mk5_kv id='secret' 的 data.blacklist。
-- 只有 super 能增刪（ban_user / unban_user），但任何登入者可呼叫 is_blacklisted() 自我檢查。

-- 目前登入者是否被停權（登入後自我檢查用；匿名一律 false）
create or replace function public.is_blacklisted()
returns boolean language sql security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    else coalesce(
      (select (data->'blacklist') ? lower(coalesce(auth.jwt()->>'email',''))
       from public.mk5_kv where id = 'secret'), false)
  end;
$$;

-- 封鎖使用者（super 專用）：加入黑名單 + 移除其管理員資格與待審申請
create or replace function public.ban_user(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(p_email,''));
begin
  if not public.is_super() then raise exception 'forbidden'; end if;
  if v_email = '' then raise exception 'email required'; end if;
  if v_email = 'markno.5.studio@gmail.com' then raise exception 'cannot ban owner'; end if;
  -- 寫入黑名單（去重）；secret 不存在則建立
  update public.mk5_kv set data = jsonb_set(
      coalesce(data,'{}'::jsonb), '{blacklist}',
      (select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from (
        select jsonb_array_elements_text(coalesce(data->'blacklist','[]'::jsonb)) as e
        union select v_email
      ) s)
    ) where id = 'secret';
  if not found then
    insert into public.mk5_kv(id, data)
      values ('secret', jsonb_build_object('blacklist', jsonb_build_array(v_email)));
  end if;
  -- 立即拔掉權限與待審申請
  delete from public.admins       where lower(coalesce(data->>'email','')) = v_email;
  delete from public.applications where lower(coalesce(data->>'email','')) = v_email;
end; $$;

-- 解除封鎖（super 專用）：從黑名單移除（之後對方可重新登入／申請）
create or replace function public.unban_user(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(p_email,''));
begin
  if not public.is_super() then raise exception 'forbidden'; end if;
  update public.mk5_kv set data = jsonb_set(
      coalesce(data,'{}'::jsonb), '{blacklist}',
      (select coalesce(jsonb_agg(e), '[]'::jsonb) from (
        select jsonb_array_elements_text(coalesce(data->'blacklist','[]'::jsonb)) as e
      ) s where s.e <> v_email)
    ) where id = 'secret';
end; $$;

-- 寫入/更新管理員 profile：本人或超級管理員可用（線上狀態、頭像、角色…）
create or replace function public.upsert_admin(p_uid uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not (public.is_super() or p_uid = auth.uid()) then raise exception 'forbidden'; end if;
  insert into public.admins(uid, data) values (p_uid, p_data)
  on conflict (uid) do update set data = public.admins.data || excluded.data;
end; $$;

-- 核准申請：超級管理員專用（建立 admins 列並刪除申請）
create or replace function public.approve_application(p_uid uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception 'forbidden'; end if;
  insert into public.admins(uid, data) values (p_uid, p_data)
  on conflict (uid) do update set data = public.admins.data || excluded.data;
  delete from public.applications where uid = p_uid;
end; $$;

-- ---------- 授權（RLS 仍會再把關） ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.mk5_kv, public.admins, public.applications to anon, authenticated;
grant execute on function public.is_admin(), public.is_super(),
  public.bootstrap_owner(), public.redeem_invite(text), public.get_invite_code(),
  public.is_blacklisted(), public.ban_user(text), public.unban_user(text),
  public.upsert_admin(uuid, jsonb), public.approve_application(uuid, jsonb) to authenticated;

-- ============================================================
--  Storage：允許「已登入的管理員」上傳到 media bucket
--  （請先在 Storage 建立名為 media 的 bucket，並打開 Public）
-- ============================================================
drop policy if exists "media upload"  on storage.objects;
drop policy if exists "media update"  on storage.objects;
create policy "media upload" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media update" on storage.objects for update to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');
-- 公開讀取：bucket 設為 Public 後自動可讀，不需額外政策。
