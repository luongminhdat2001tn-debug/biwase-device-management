# Quản Lý Thiết Bị (`/devices`)

## Purpose

A standalone page for managing the company's devices (the `devices` table in
`supabase/schema.sql`). It mirrors the Quản Lý Kho list/modal pattern but has no
warehouses: one flat device list with search, plus create, edit, and delete.

## Non-goals

- No warehouse tabs, quantities, history logging, or image upload.
- No soft delete (the table has no `is_deleted` column).
- No database schema change.
- No per-manufacturer or per-location grouping.

## Access control

- New permission id `quan-ly-thiet-bi` added to `CHUC_NANG_LIST` in
  `lib/constants.ts` (name "Quản lý thiết bị"), so it can be granted on the
  Tài Khoản page. The admin seed in `schema.sql` already carries this id.
- A user may use the page if `user.isAdmin` is true or `user.chucNang`
  includes `quan-ly-thiet-bi`.
- Sidebar shows "Quản Lý Thiết Bị" (icon `HardDrive`, href `/devices`) only to
  permitted users. Users without permission who reach `/devices` directly see a
  "không có quyền truy cập" card, with no add/edit/delete controls.
- Session is read from `localStorage['user']`; no session redirects to `/`
  (same as all existing pages).

## Data model

`Device` interface in `lib/constants.ts`:

| Field | Type | Source column | Notes |
| --- | --- | --- | --- |
| `id` | number | `id` | primary key |
| `deviceId` | string | `device_id` | required, trimmed + uppercased in UI |
| `name` | string | `name` | required |
| `manufacturer` | string | `manufacturer` | required |
| `location` | string | `location` | required |

`lib/db.ts` gains, following the existing error-handling style (log and return
`[]` / `null` / `false`):

- `getDevices(): Promise<Device[]>` — all rows ordered by `name`.
- `findDeviceByDeviceId(deviceId: string): Promise<{ id: number } | null>` —
  case-insensitive exact match via `ilike`, `.limit(1).maybeSingle()`.
- `createDevice(device: Omit<Device, 'id'>): Promise<Device | null>`
- `updateDevice(id: number, updates: Partial<Device>): Promise<boolean>`
- `deleteDevice(id: number): Promise<boolean>` — hard `delete()`.
- `mapDeviceFromDB(row)` — `device_id` → `deviceId`.

## Page (`app/devices/page.tsx`)

`'use client'`. Structure copied from `app/account/page.tsx`:

- Header: "Quản Lý Thiết Bị".
- One `Card` (blue left border) titled "Danh Sách Thiết Bị" with a "Thêm Thiết
  Bị" button (permitted users only).
- Search input filters on `deviceId` and `name`, case-insensitive, client-side.
- Table columns: Mã thiết bị, Tên thiết bị, Nhà sản xuất, Vị trí, Thao tác.
- Row states: "Đang tải..." while loading, "Không có thiết bị nào" when empty.
- Edit and delete icons per row, permitted users only.

## Add/edit modal

One shared modal; `editingDevice === null` means add, otherwise edit. Fields in
order: Mã thiết bị, Tên thiết bị, Nhà sản xuất, Vị trí — all required, labelled
with `*`.

- Validation runs on save; missing fields get inline red messages (warehouse-page
  style), cleared as the user types. Nothing is sent while invalid.
- `device_id` is `.trim().toUpperCase()`.
- Duplicate `device_id` is rejected on create and on edit (excluding the record
  being edited) with an `alert`; the modal stays open. This is app-level only —
  the schema has no UNIQUE constraint.
- `createDevice` / `updateDevice` failure alerts and keeps the modal open.
- Success reloads the list and closes the modal. Save button is disabled while a
  save is in flight.

Delete asks `confirm()` then hard-deletes and reloads. A failed delete alerts.

## Verification

The repo has no test/lint/typecheck setup (`next build` ignores TS errors), so:

1. `npm run build` succeeds.
2. Manual checklist: create; duplicate mã bị chặn; edit (incl. changing mã to an
   existing one); search; delete; user without `quan-ly-thiet-bi` sees no menu
   item and is blocked on direct navigation; admin sees and can perform all.

## Accepted risks

- Hard delete is irreversible.
- `device_id` uniqueness is enforced only in the UI; direct Supabase inserts can
  create duplicates.
