# Smart Borang Live Deployment Plan

Dokumen ini menerangkan laluan untuk bawa prototype Smart Borang ke live menggunakan GitHub, Vercel dan Supabase.

## Stack

- GitHub: version control dan integrasi deploy.
- Vercel: hosting Next.js.
- Supabase: database, auth, storage dan audit log.

## Langkah Deploy

1. Push projek ke GitHub.
2. Buka Vercel dan import repository GitHub.
3. Pilih framework `Next.js`.
4. Deploy aplikasi.
5. Bina projek Supabase.
6. Masukkan environment variable Supabase di Vercel.
7. Sambungkan login, database dan upload fail.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` hanya digunakan di server-side API route. Jangan expose key ini di browser.

## Jadual Supabase Dicadangkan

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text not null,
  staff_id text unique,
  role text not null check (role in ('Pegawai', 'Ketua Unit', 'Pengarah')),
  unit text,
  created_at timestamptz default now()
);

create table forms (
  id uuid primary key default gen_random_uuid(),
  form_code text unique not null,
  name text not null,
  category text not null,
  version text not null default 'v1.0',
  status text not null default 'Aktif',
  source text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table form_files (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id),
  submitted_by uuid references profiles(id),
  status text not null default 'Draf',
  payload jsonb not null default '{}',
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table approval_steps (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  approver_id uuid references profiles(id),
  step_name text not null,
  status text not null default 'Menunggu',
  comments text,
  decided_at timestamptz,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

## Storage Buckets

- `form-templates`: fail PDF, DOCX, XLSX dan imej borang asal.
- `submission-attachments`: dokumen sokongan pengguna.

## Nota Migration

Fail statik lama (`app.html`, `script.js`, `styles.css`) masih dikekalkan sebagai prototype interaktif segera. Folder `app/` ialah permulaan versi Next.js untuk deploy Vercel.
