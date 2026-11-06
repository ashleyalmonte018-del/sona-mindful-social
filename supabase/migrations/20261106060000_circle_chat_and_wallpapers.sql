create table if not exists public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint circle_messages_not_self check (sender_id <> recipient_id)
);

grant select, insert on public.circle_messages to authenticated;
alter table public.circle_messages enable row level security;

drop policy if exists "Friends can read messages" on public.circle_messages;
create policy "Friends can read messages"
  on public.circle_messages for select to authenticated
  using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and public.are_friends(sender_id, recipient_id)
  );

drop policy if exists "Friends can send messages" on public.circle_messages;
create policy "Friends can send messages"
  on public.circle_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.are_friends(sender_id, recipient_id)
  );

create index if not exists circle_messages_sender_recipient_created_idx
  on public.circle_messages (sender_id, recipient_id, created_at);
create index if not exists circle_messages_recipient_sender_created_idx
  on public.circle_messages (recipient_id, sender_id, created_at);

do $$ begin
  alter publication supabase_realtime add table public.circle_messages;
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-backgrounds',
  'chat-backgrounds',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their chat backgrounds" on storage.objects;
create policy "Users can read their chat backgrounds"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their chat backgrounds" on storage.objects;
create policy "Users can upload their chat backgrounds"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their chat backgrounds" on storage.objects;
create policy "Users can update their chat backgrounds"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their chat backgrounds" on storage.objects;
create policy "Users can delete their chat backgrounds"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
