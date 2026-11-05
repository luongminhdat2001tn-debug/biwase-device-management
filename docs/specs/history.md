# Lịch Sử Công Việc (`/history`)

## Purpose

A read-only log of maintenance activity, backed by the `task_history_log`
table in `supabase/schema.sql`. It replaced the old warehouse history page
(`history_log`), which no longer exists.

## Non-goals

- No writes from this page itself; rows come from the devices and tasks pages
  (see "Related changes").
- No warehouse, product, quantity or unit data — those columns were removed
  with `history_log`.
- No print / export-to-print flow; the old `app/history/print` page and
  `preview-print-file` were deleted.
- No pagination or sorting controls; rows come back newest first.
- No permission gate: every signed-in user can open the page (unchanged).

## Data model

`HistoryEntry` in `lib/constants.ts`:

| Field | Type | Source column | Notes |
| --- | --- | --- | --- |
| `date` | string | `date` | display string as stored (e.g. `dd/mm/yyyy`) |
| `time` | string | `time` | display string as stored |
| `taskName` | string | `task_name` | shown in the "Đối tượng" column (device or task name) |
| `userName` | string | `user_name` | shown in "Họ và tên" |
| `action` | string | `action` | `'Công việc'` or `'Thiết bị'` |
| `details` | string | `details` | free text shown in "Thông tin chức năng" |

`lib/db.ts` exposes:

- `getHistoryLog(): Promise<HistoryEntry[]>` — selects all rows from
  `task_history_log`, ordered by `created_at` descending, mapped through
  `mapHistoryFromDB` (`task_name` → `taskName`). Errors log and return `[]`.
- `addHistoryEntry({ taskName, userName, action, details })` — inserts a row and
  fills `date`/`time` from the current time (`vi-VN`). Returns `boolean`; callers
  ignore it, so a failed log never blocks the change it describes.

Writers: the devices page (`action` = `'Thiết bị'`) and the tasks page
(`action` = `'Công việc'`), after a successful create/update/delete. See
`docs/specs/device.md` and `docs/specs/task.md` for the exact `details` text.

## Page (`app/history/page.tsx`)

`'use client'`, same shell as the other pages (`Sidebar`, header, `Card`s).
Session comes from `localStorage['user']`; no session redirects to `/`.

- Title: "Lịch Sử Công Việc".
- Filters card:
  - date range (`Từ` / `Đến`, compared against `entry.date` as local
    midnight, inclusive);
  - **Tên đối tượng** — case-insensitive substring match on `taskName`;
  - **Chức năng** — `Tất cả` / `Công việc` / `Thiết bị`.
  - "Xóa bộ lọc" appears when any filter is active and resets them all.
- Table card "Lịch Sử Hoạt Động (n bản ghi)" with columns: Ngày/tháng/năm,
  Thời gian, Họ và tên, Đối tượng, Chức năng (coloured badge), Thông tin
  chức năng.
- Empty states: "Không có bản ghi nào phù hợp với bộ lọc" when filters are
  active, otherwise "Chưa có lịch sử hoạt động".
- "Xuất Excel" appears when rows are visible and writes the filtered rows
  (`STT`, `Ngày`, `Thời gian`, `Họ và tên`, `Đối tượng`, `Chức năng`,
  `Thông tin`) to `LichSuCongViec_<date>.xlsx`, sheet "Lịch sử công việc".

Action badge colours: `Công việc` blue, `Thiết bị` green, anything else gray.

## Related changes

- `components/sidebar.tsx`: the `history` menu item label is "Lịch Sử Công
  Việc" (id/href/icon unchanged).
- `app/devices/page.tsx` and `app/tasks/page.tsx` now write history rows (see
  their specs).
- `app/warehouse/page.tsx`: the five `addHistoryEntry` calls (export, import,
  add quantity, edit, delete, create) were removed; warehouse actions are no
  longer logged anywhere.

## Verification

The repo has no test/lint/typecheck setup (`next build` ignores TS errors), so:

1. `npm run build` succeeds.
2. Manual: create, edit and delete a device and a task; each action adds one row
   to `/history` with the right Đối tượng, Chức năng badge and Thông tin;
   each filter narrows the list; Excel export matches the visible rows.

## Accepted risks

- Warehouse activity is no longer recorded; that history is gone with
  `history_log`.
