# Quản Lý Thiết Bị Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a `/devices` page that lists the `devices` table and lets permitted users create, edit, search, and delete devices.

**Architecture:** One client page modelled on `app/account/page.tsx` (single `Card`, shared add/edit modal), a thin set of functions in `lib/db.ts` with a snake→camel mapper, a `Device` type and `quan-ly-thiet-bi` permission in `lib/constants.ts`, and a permission-filtered sidebar item.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (`Card`, `Button`, `Input`), lucide-react, Supabase JS.

**Spec:** `docs/specs/device.md`

## Global Constraints

- Vietnamese UI text and Vietnamese code comments, matching every existing page.
- Never call `supabase.from()` outside `lib/db.ts`.
- `device_id` → `deviceId` conversion only through `mapDeviceFromDB`.
- The repo has **no test runner, no eslint config, and `next build` ignores TS errors**. Verification is `npm run build` plus the manual checklist in Task 4; self-review types by reading.
- Do not modify `supabase/schema.sql`.
- Hard delete only; no history-log writes; no image upload.

## Review Focus

Each line is verified in Task 4's manual checklist.

1. `device_id` entered with different case or surrounding spaces (`tb-01`, ` TB-01 `) must be rejected as a duplicate.
2. Editing a device without changing its `device_id` must not be rejected as a duplicate of itself.
3. A failed Supabase insert/update must alert and leave the modal open with the typed values intact.
4. A user without `quan-ly-thiet-bi` (and not admin) must not see the menu item, and direct navigation to `/devices` must show a permission message with no add/edit/delete controls.
5. Special characters in any field (`<script>`, quotes) must render as literal text in the table (React escapes by default; never use `dangerouslySetInnerHTML`).

---

### Task 1: Device type, permission entry, and data layer

**Files:**
- Modify: `lib/constants.ts` (interface section after `Product`; `CHUC_NANG_LIST` at lines 17-27)
- Modify: `lib/db.ts` (new section after `PRODUCTS`, before `HISTORY LOG`; mapper next to `mapProductFromDB`)

**Interfaces:**
- Produces (all exported):
  - `interface Device { id: number; deviceId: string; name: string; manufacturer: string; location: string }`
  - `getDevices(): Promise<Device[]>`
  - `findDeviceByDeviceId(deviceId: string): Promise<{ id: number } | null>`
  - `createDevice(device: Omit<Device, 'id'>): Promise<Device | null>`
  - `updateDevice(id: number, updates: Partial<Device>): Promise<boolean>`
  - `deleteDevice(id: number): Promise<boolean>`
  - Permission id `'quan-ly-thiet-bi'` present in `CHUC_NANG_LIST`

- [x] **Step 1: Add the `Device` interface to `lib/constants.ts`**

Insert after the `Product` interface, with a Vietnamese section comment:

```ts
export interface Device {
  id: number
  deviceId: string
  name: string
  manufacturer: string
  location: string
}
```

- [x] **Step 2: Add the permission to `CHUC_NANG_LIST`**

Append after the four `kho-*` entries (keep the existing commas correct):

```ts
  { id: 'quan-ly-thiet-bi', name: 'Quản lý thiết bị', description: 'Có thể xem/thêm/sửa/xóa thiết bị' },
```

- [x] **Step 3: Add device functions to `lib/db.ts`**

Add before the `HISTORY LOG` section. Each function logs via `console.error` and returns the same failure value the existing functions use (`[]`, `null`, `false`):

- `getDevices` — `.from('devices').select('*').order('name', { ascending: true })`, map rows with `mapDeviceFromDB`.
- `findDeviceByDeviceId` — trim + uppercase; if empty return `null`; `.select('id').ilike('device_id', normalized).limit(1).maybeSingle()`; return `{ id: data.id }` or `null`.
- `createDevice` — insert `{ device_id, name, manufacturer, location }` (trimmed values), `.select().single()`, return mapped row or `null`.
- `updateDevice` — build a snake_case object only for defined keys (`deviceId`→`device_id`, `name`, `manufacturer`, `location`), `.update(...).eq('id', id)`, return `true`/`false`.
- `deleteDevice` — `.delete().eq('id', id)`, return `true`/`false`.

- [x] **Step 4: Add `mapDeviceFromDB`**

Next to `mapProductFromDB`:

```ts
function mapDeviceFromDB(row: any): Device {
  return {
    id: row.id,
    deviceId: row.device_id || '',
    name: row.name || '',
    manufacturer: row.manufacturer || '',
    location: row.location || '',
  }
}
```

Update the file's header comment list of tables to include `devices`.

- [x] **Step 5: Verify the build**

Run: `npm run build`
Expected: build completes with no error. (TS errors are ignored by config; re-read the new signatures against the `Device` interface.)

- [x] **Step 6: Commit**

```bash
git add lib/constants.ts lib/db.ts
git commit -m "feat: add device type, permission, and data layer"
```

---

### Task 2: `/devices` page

**Files:**
- Create: `app/devices/page.tsx`

**Interfaces:**
- Consumes: `Device` from `@/lib/constants`; `getDevices`, `findDeviceByDeviceId`, `createDevice`, `updateDevice`, `deleteDevice` from `@/lib/db` (Task 1).

**Permission rule (used in three places):** `const canManage = !!user && (user.isAdmin || (Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']).includes('quan-ly-thiet-bi'))`.

- [x] **Step 1: Scaffold the page shell, session, load, and list**

`'use client'`. Copy the outer structure and styling from `app/account/page.tsx` (lines 108-137): `<Sidebar />`, `flex-1 md:ml-64`, `p-4 md:p-8 bg-gray-50 min-h-screen`, `h1` "Quản Lý Thiết Bị", one `Card` with `border-l-4 border-l-blue-600`.

State: `user`, `devices: Device[]`, `loading`, `searchTerm`, `isModalOpen`, `editingDevice: Device | null`, `isSaving`, `formData` (`deviceId`, `name`, `manufacturer`, `location`), `formErrors` (same four keys, `string | undefined`).

On mount: read `localStorage.getItem('user')`; if absent `window.location.href = '/'`; else `setUser(parsed)` and `loadDevices()` (`setLoading` around `getDevices()`).

Render, inside the card:
- `CardTitle` "Danh Sách Thiết Bị" with a `HardDrive` icon; "Thêm Thiết Bị" `Button` (blue, `Plus` icon) rendered only when `canManage`.
- Search `Input` with `Search` icon: placeholder "Tìm kiếm theo mã hoặc tên thiết bị..."; filter `deviceId`/`name` case-insensitively.
- Table headers: Mã thiết bị, Tên thiết bị, Nhà sản xuất, Vị trí, and "Thao tác" only when `canManage`.
- Body states: `loading` → "Đang tải..."; empty → "Không có thiết bị nào"; each row shows the four values (mã in `font-mono text-blue-600`) and, when `canManage`, edit (`Edit2`) and delete (`Trash2`) icon buttons.
- `colSpan` equals 5 with actions, 4 without.
- When `user` is set and `!canManage`, render a permission `Card` with `AlertCircle` and text "Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên." instead of the list card.
- Return "Loading..." while `!user` (same as existing pages).

- [x] **Step 2: Add the shared add/edit modal**

One modal rendered when `isModalOpen`. Title `editingDevice ? 'Sửa Thiết Bị' : 'Thêm Thiết Bị'`; `X` close button.

Fields (all required, label suffixed `*`, `className` with red border/background when that key exists in `formErrors`): Mã thiết bị, Tên thiết bị, Nhà sản xuất, Vị trí. Mã input uppercases on change (`e.target.value.toUpperCase()`). Each `onChange` also clears its own `formErrors` key. Below each field, when an error exists, show `<p className="text-red-600 text-xs mt-1 font-medium">⚠️ {error}</p>`.

`handleAdd`: reset `editingDevice` to `null`, empty `formData`, empty `formErrors`, `isSaving` false, open.
`handleEdit(device)`: copy the four values into `formData`, set `editingDevice`, reset `formErrors`, open.

`validate()` returns errors for any field whose `.trim()` is empty, with messages "Vui lòng nhập mã thiết bị" / "...tên thiết bị" / "...nhà sản xuất" / "...vị trí".

`handleSave`:
1. `const errors = validate()`; if any, `setFormErrors(errors)` and return.
2. `const normalized = formData.deviceId.trim().toUpperCase()`; `const found = await findDeviceByDeviceId(normalized)`; if `found && found.id !== editingDevice?.id`, `alert('Mã thiết bị này đã tồn tại. Vui lòng kiểm tra lại')` and return.
3. `setIsSaving(true)`; call `updateDevice(editingDevice.id, {...})` when editing, else `createDevice({...})` with trimmed values.
4. On `false`/`null`: `alert('❌ Lưu thất bại! Vui lòng thử lại.')`, `setIsSaving(false)`, return (modal stays open).
5. On success: `await loadDevices()`, close, `setIsSaving(false)`.

Footer: "Hủy" `Button variant="outline"` closing the modal; save `Button` labelled `editingDevice ? 'Cập Nhật' : 'Tạo Mới'`, `disabled={isSaving}`.

- [x] **Step 3: Add delete**

`handleDelete(device)`: `confirm(\`Bạn có chắc chắn muốn xóa "${device.name}"?\`)`; on yes `const ok = await deleteDevice(device.id)`; if `!ok` alert failure; else `await loadDevices()`.

- [x] **Step 4: Verify the build**

Run: `npm run build`
Expected: completes with no error and lists `/devices` in the route output.

- [x] **Step 5: Commit**

```bash
git add app/devices/page.tsx
git commit -m "feat: add device management page"
```

---

### Task 3: Sidebar menu item

**Files:**
- Modify: `components/sidebar.tsx` (menu list lines 32-38; user state around lines 47-64; nav mapping lines 152-175)

**Interfaces:**
- Consumes: permission id `'quan-ly-thiet-bi'` from Task 1.

- [x] **Step 1: Add the menu entry**

Declare the array with an optional permission so TypeScript accepts the mixed shape:

```ts
const MENU_ITEMS: { id: string; label: string; icon: any; href: string; permission?: string }[] = [
```

Then add, after the `warehouse` entry:

```ts
  { id: 'devices', label: 'Quản Lý Thiết Bị', icon: HardDrive, href: '/devices', permission: 'quan-ly-thiet-bi' },
```

Import `HardDrive` from `lucide-react`.

- [x] **Step 2: Filter by permission**

Replace the `userName` string state with a `user` state object (`useState<any>(null)`) and in the footer replace `{userName}` with `{user?.name || user?.username || 'User'}`. In the effect that reads localStorage, `setUser(parsed)`.

In the nav map, compute:

```ts
const visible = !item.permission || !!user && (user.isAdmin || (Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']).includes(item.permission))
```

and skip the item when `!visible`. Items without `permission` stay visible to everyone, as today.

- [x] **Step 3: Verify the build**

Run: `npm run build`
Expected: completes with no error.

- [x] **Step 4: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add permission-aware device management menu item"
```

---

### Task 4: End-to-end verification and spec sync

**Files:**
- Modify (only if behavior changed): `docs/specs/device.md`

- [ ] **Step 1: Start the app and sign in as admin**

Run: `npm run dev`, open `http://localhost:3000`, sign in with the admin account from `supabase/seed.sql`/`schema.sql`.
Expected: sidebar shows "Quản Lý Thiết Bị".

- [ ] **Step 2: Walk the checklist**

- Create a device with mã `TB-001`; it appears in the table.
- Create another with mã ` tb-001 `; blocked as duplicate (Review Focus 1).
- Edit `TB-001` without changing the mã; saves normally (Review Focus 2).
- Edit it to another existing mã; blocked.
- Search by partial mã and partial tên; rows filter correctly.
- Paste `<script>alert(1)</script>` into Tên thiết bị; the table shows it literally and no alert fires (Review Focus 5).
- Temporarily point `.env.local` at an unreachable URL (or disconnect network), try a save: alert appears, modal keeps the typed values (Review Focus 3). Restore env afterwards.
- Delete the test device: confirm dialog, row disappears, and it is gone after reload (hard delete).
- Sign in as a non-admin account without `quan-ly-thiet-bi`: menu item absent; `http://localhost:3000/devices` shows the permission message with no buttons (Review Focus 4).

- [ ] **Step 3: Update the spec if behavior changed**

If any implemented behavior differs from `docs/specs/device.md` (labels, validation messages, permission rule, delete behavior), edit the spec to match, then note the change in the commit message.

- [ ] **Step 4: Commit any spec change**

```bash
git add docs/specs/device.md
git commit -m "docs: sync device spec with implementation"
```

(Skip the commit when nothing changed.)
