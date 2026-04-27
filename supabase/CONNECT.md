# Supabase Connection Guide

## 1) Environment variables
Set these values in .env:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET

## 2) Run database schema
In Supabase SQL Editor, run supabase/schema.sql.

## 3) Route to table mapping

Auth routes:
- app/api/auth/login/route.ts: sign in auth.users, then reads profiles for role/full_name
- app/api/auth/register/route.ts: creates auth user, inserts profiles row
- app/api/auth/profile/route.ts: updates auth user + profiles row
- app/api/auth/password/route.ts: verifies current password, updates auth password
- app/api/auth/me/route.ts: reads signed app token from cookie

Data routes:
- app/api/equipment/route.ts: reads/writes equipment
- app/api/equipment/[id]/route.ts: updates/deletes equipment
- app/api/borrow-requests/route.ts: reads/writes borrow_requests + notifications
- app/api/borrow-requests/[id]/route.ts: updates borrow_requests status + notifications
- app/api/dashboard/route.ts: reads equipment + borrow_requests for stats
- app/api/history/route.ts: reads borrow_requests + equipment for table/csv
- app/api/notifications/route.ts: reads notifications
- app/api/notifications/[id]/route.ts: marks one notification read
- app/api/notifications/read-all/route.ts: marks all notifications read

## 4) Client/server Supabase helpers in code
- lib/server/supabase.ts
  - getSupabaseAnonClient(): login/password verification
  - getSupabaseServiceClient(): trusted backend reads/writes

## 5) Important behavior
- App role checks use the gym_token cookie issued by your API.
- Login loads role from profiles first, then metadata fallback.
- If role changes in DB, logout/login again to refresh token role.

## 6) Quick verification checklist
- Can login as admin@gym.com and land on /admin/dashboard
- Can register borrower and land on /dashboard
- Admin can create/edit/delete equipment
- Borrower can submit request
- Admin can approve/reject/return request
- Notifications and history populate from Supabase
