# Quản Lý Công Việc (`/tasks`)

## Purpose

A standalone page for managing maintenance jobs (the `tasks` table in
`supabase/schema.sql`). It mirrors the Quản Lý Thiết Bị list/modal pattern: one
flat list with search, plus create, edit, and delete. Each job belongs to one
device from the `devices` table.

## Non-goals

- No status field ("chưa làm" / "hoàn thành"), no overdue badges.
- No dashboard counters, notifications, history logging, or per-device grouping.
- No separate detail page: the add/edit modal is where images and the deadline
  are shown.
- No sorting controls; the list is ordered by `created_at` descending.
- No image history: replacing or deleting an image removes the old file.

## Access control

- New permission id `quan-ly-cong-viec` in `CHUC_NANG_LIST` in
  `lib/constants.ts` (name "Quản lý công việc"), so it can be granted on the
  Tài Khoản page.
- A user may use the page if `user.isAdmin` is true or `user.chucNang`
  includes `quan-ly-cong-viec`.
- Sidebar shows "Quản Lý Công Việc" (icon `ClipboardList`, href `/tasks`) only
  to permitted users. Users without permission who reach `/tasks` directly see
  the "không có quyền truy cập" card, with no add/edit/delete controls.
- Session is read from `localStorage['user']`; no session redirects to `/`
  (same as all existing pages).

## Data model

`Task` interface in `lib/constants.ts`:

| Field | Type | Source column | Notes |
| --- | --- | --- | --- |
| `id` | number | `id` | primary key |
| `deviceId` | number | `device_id` | FK to `devices.id`, required |
| `taskName` | string | `task_name` | required |
| `taskDescription` | string | `task_description` | required |
| `remainingDay` | number | `remaining_day` | derived from `expired_at` and today on save; read-only in the UI |
| `maintainedImageUrl` | string | `maintained_image_url` | required |
| `expiredAt` | string | `expired_at` | ISO date; edited as `yyyy-mm-dd` |
| `createdAt` | string | `created_at` | read-only, formatted `dd/mm/yyyy` |
| `updatedAt` | string | `updated_at` | read-only, set on update |

The device name is not stored on the task. The page resolves it from the
already-loaded `getDevices()` list (`devices.find(d => d.id === task.deviceId)?.name`),
so the list also works if the FK constraint has not been applied to a given
database yet.

`lib/db.ts` gains, following the existing error-handling style (log and return
`[]` / `null` / `false`):

- `getTasks(): Promise<Task[]>` — all rows ordered by `created_at` descending.
- `createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null>`
- `updateTask(id: number, updates: Partial<Task>): Promise<boolean>` — also sets
  `updated_at` to the current time.
- `deleteTask(id: number): Promise<boolean>` — hard `delete()` (no
  `is_deleted` column).
- `mapTaskFromDB(row)` — snake_case → camelCase.

Images reuse the existing `uploadImage(file, 'tasks')` helper. The device
dropdown reuses `getDevices()`.

## Schema change

The delete warning below must be true, so `tasks.device_id` cascades:

```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_device;
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_device
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;
```

This replaces the current non-cascading `ADD CONSTRAINT` block in
`supabase/schema.sql` (kept re-runnable with `DROP CONSTRAINT IF EXISTS`).
`tasks` has one maintenance image, `maintained_image_url TEXT NOT NULL`. An
existing database needs (the `DEFAULT ''` only lets the NOT NULL column be
added to rows that already exist):

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS maintained_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks
  DROP COLUMN IF EXISTS image_before_maintenance_url,
  DROP COLUMN IF EXISTS image_after_maintenance_url;
```

The user applies the SQL manually in the Supabase SQL Editor.

## Page (`app/tasks/page.tsx`)

`'use client'`. Structure copied from `app/devices/page.tsx`:

- Header: "Quản Lý Công Việc".
- One `Card` (blue left border) titled "Danh Sách Công Việc" with a "Thêm Công
  Việc" button (permitted users only).
- Search input filters on `taskName` and the resolved device name,
  case-insensitive, client-side.
- Table columns: Thiết bị, Tên công việc, Mô tả (truncated), Ngày tạo, Thao
  tác. Images and the deadline are **not** columns; they live in the modal.
- Row states: "Đang tải..." while loading, "Không có công việc nào" when empty.
- Edit and delete icons per row, permitted users only.

## Add/edit modal

One shared modal; `editingTask === null` means add, otherwise edit. The modal
uses the "Sửa Sản Phẩm Tồn Kho" pattern: `max-w-4xl`, body is
`grid grid-cols-1 md:grid-cols-2 gap-4`.

Layout:

| Row | Left | Right |
| --- | --- | --- |
| 1 | Thiết bị * (autocomplete input + dropdown) | Hạn hoàn thành * (date input `yyyy-mm-dd`, `min` = today) |
| 2 | Tên công việc * (`md:col-span-2`) | |
| 3 | Mô tả * (textarea, `md:col-span-2`, `min-h-24`) | |
| 4 | 📷 Ảnh bảo trì * (`md:col-span-2`) | |

**Thiết bị autocomplete:** the input filters `devices` by `deviceId` or `name`,
case-insensitive, and shows a dropdown of `Mã — Tên` options. Picking an option
stores `device.id` and fills the input with the label; typing after a selection
clears `deviceId` so the user must pick again. Focusing a selected/empty input
shows all devices. No match shows "Không tìm thấy thiết bị". Save requires a
picked device ("Vui lòng chọn thiết bị từ danh sách"). Options are buttons
(Tab/Enter accessible) inside a `role="listbox"`.

**Hạn hoàn thành:** `min` is today's local date, and save rejects an earlier
date with "Hạn hoàn thành không được trước hôm nay" (`min` alone is not enforced
by every browser).

**Số ngày còn lại:** a disabled input under Hạn hoàn thành. It is computed live
from the selected date and today (both local dates): today = 0, tomorrow = 1,
+7 days = 7; "—" when no date is picked. On save the value is written to
`remaining_day`. On edit it is recomputed from the stored `expired_at`.

Required fields are labelled `*`. If the devices list is empty, show a hint and
block save.

Images use the warehouse modal's upload box: a dashed box with an `Upload` icon
wrapping a hidden file input, an instant `FileReader` preview in a `w-24 h-24`
thumbnail, and a red circular `X` to clear. New files are uploaded only on save
with `uploadImage(file, 'tasks')`, so cancelling leaves nothing behind.

- Ảnh bảo trì is required: clearing it and saving shows the inline
  "Vui lòng chọn ảnh bảo trì" error. Editing without picking a file keeps the
  stored image (the preview starts from it).
- Picking a new file replaces the preview and, on save, the stored URL. After
  the DB write succeeds, the previous file is deleted from Storage with
  `deleteImage` (best-effort, console only). If the DB write fails, the newly
  uploaded file is deleted instead, so no orphan is left.

Validation runs on save; missing fields get inline red messages (device-page
style), cleared as the user types. Nothing is sent while invalid.

On save, new files are uploaded with `uploadImage(file, 'tasks')` first, then
`createTask` / `updateTask` runs with the resulting URLs (or the kept URLs). An
upload or save failure alerts and keeps the modal open. Success reloads the
list and closes the modal. The save button is disabled while a save is in
flight.

Delete asks `confirm()` then hard-deletes and reloads. A failed delete alerts.
`deleteTask` reads `maintained_image_url` before deleting the row and removes
the file afterwards (best-effort).

## History logging

After a successful create, update or delete, the page calls
`addHistoryEntry` (`lib/db.ts`) to append a `task_history_log` row:
`task_name` = task name, `action` = `'Công việc'`, `user_name` = the session
user, `details` = `Thêm công việc` / `Cập nhật công việc` / `Xóa công việc`.
`date`/`time` are filled by the helper. Logging is best-effort: a failed insert
only logs to the console and never blocks or reverses the task change.

## Related change: deleting a device

`app/devices/page.tsx` `handleDelete` confirm message gains the warning (exact
text):

```
Lưu ý: Xóa thiết bị này, các mục công việc liên quan cũng sẽ bị xóa ở trang Quản Lý Thiết Bị
```

The cascade FK makes the related `tasks` rows disappear with the device. The
Delete section of `docs/specs/device.md` is updated to match.

## Verification

The repo has no test/lint/typecheck setup (`next build` ignores TS errors), so:

1. `npm run build` succeeds.
2. Manual checklist: create (all required fields, with ảnh bảo trì + deadline);
   validation blocks empty fields; edit prefills and keeps the image unless
   replaced; search by device name and task name; delete task; delete a device
   that has tasks (warning shows, tasks disappear); user without
   `quan-ly-cong-viec` sees no menu item and is blocked on direct navigation;
   admin sees and can perform all.

## Accepted risks

- Deleting a device permanently deletes its tasks; their image files are
  removed from the `images` bucket by `deleteDevice` (best-effort — a failed
  file delete leaves an orphan without failing the device delete).
- The cascade FK is applied manually; a database without it rejects deleting a
  device that has tasks.
- `task_name` has no uniqueness constraint; duplicate names are allowed.
- `expired_at` and `updated_at` are timestamps; the UI only edits/display the
  date part.
