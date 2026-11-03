# Lịch Sử Công Việc (`/history`)

## Purpose

A read-only log of maintenance activity, backed by the `task_history_log`
table in `supabase/schema.sql`. It replaced the old warehouse history page
(`history_log`), which no longer exists.

## Non-goals

- No writes from this page, and no logging is wired into other pages yet: the
  page only reads rows inserted into `task_history_log`.
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
| `taskName` | string | `task_name` | shown in the "Tên công việc" column |
| `userName` | string | `user_name` | shown in "Họ và tên" |
| `action` | string | `action` | `'Công việc'` or `'Thiết bị'` |
| `details` | string | `details` | free text shown in "Thông tin chức năng" |

`lib/db.ts` exposes `getHistoryLog(): Promise<HistoryEntry[]>` — selects all
rows from `task_history_log`, ordered by `created_at` descending, mapped through
`mapHistoryFromDB` (`task_name` → `taskName`). Errors log and return `[]`.

There is no `addHistoryEntry`: warehouse logging was removed along with
`history_log`, and no page writes history rows yet.

## Page (`app/history/page.tsx`)

`'use client'`, same shell as the other pages (`Sidebar`, header, `Card`s).
Session comes from `localStorage['user']`; no session redirects to `/`.

- Title: "Lịch Sử Công Việc".
- Filters card:
  - date range (`Từ` / `Đến`, compared against `entry.date` as local
    midnight, inclusive);
  - **Tên công việc** — case-insensitive substring match on `taskName`;
  - **Chức năng** — `Tất cả` / `Công việc` / `Thiết bị`.
  - "Xóa bộ lọc" appears when any filter is active and resets them all.
- Table card "Lịch Sử Hoạt Động (n bản ghi)" with columns: Ngày/tháng/năm,
  Thời gian, Họ và tên, Tên công việc, Chức năng (coloured badge), Thông tin
  chức năng.
- Empty states: "Không có bản ghi nào phù hợp với bộ lọc" when filters are
  active, otherwise "Chưa có lịch sử hoạt động".
- "Xuất Excel" appears when rows are visible and writes the filtered rows
  (`STT`, `Ngày`, `Thời gian`, `Họ và tên`, `Tên công việc`, `Chức năng`,
  `Thông tin`) to `LichSuCongViec_<date>.xlsx`, sheet "Lịch sử công việc".

Action badge colours: `Công việc` blue, `Thiết bị` green, anything else gray.

## Related changes

- `components/sidebar.tsx`: the `history` menu item label is "Lịch Sử Công
  Việc" (id/href/icon unchanged).
- `app/warehouse/page.tsx`: the five `addHistoryEntry` calls (export, import,
  add quantity, edit, delete, create) were removed; warehouse actions are no
  longer logged anywhere.

## Verification

The repo has no test/lint/typecheck setup (`next build` ignores TS errors), so:

1. `npm run build` succeeds.
2. Manual: page opens with the empty state; a hand-inserted row in
   `task_history_log` appears with its task name, action badge and details;
   each filter narrows the list; Excel export matches the visible rows.

## Accepted risks

- The page stays empty until something writes to `task_history_log`.
- Warehouse activity is no longer recorded; that history is gone with
  `history_log`.
