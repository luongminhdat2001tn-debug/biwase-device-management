# Quản Lý Công Việc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/tasks` page that lists the `tasks` table and lets permitted users create, edit, search, and delete maintenance jobs, plus make device deletion cascade to its tasks with a warning.

**Architecture:** One client page modelled on `app/devices/page.tsx` (single `Card`, shared add/edit modal with image uploads), a thin set of functions in `lib/db.ts` with a snake→camel mapper, a `Task` type and `quan-ly-cong-viec` permission in `lib/constants.ts`, a permission-filtered sidebar item, and a one-line FK change so device deletion removes related tasks.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (`Card`, `Button`, `Input`), lucide-react, Supabase JS.

**Spec:** `docs/specs/task.md`

## Global Constraints

- Vietnamese UI text and Vietnamese code comments, matching every existing page.
- Never call `supabase.from()` outside `lib/db.ts`.
- `device_id` → `deviceId` and all other column conversions only through `mapTaskFromDB` / the insert-update maps in `lib/db.ts`.
- Reuse `uploadImage(file, 'tasks')` and `getDevices()`; add no dependencies and no new components.
- The repo has **no test runner, no eslint config, and `next build` ignores TS errors**. Verification is `npm run build` plus the manual checklist in Task 5; self-review types by reading.
- `supabase/schema.sql` changes are applied manually in the Supabase SQL Editor by the user.
- Hard delete only; no history-log writes; no status field; list shows no image or deadline columns.

## Review Focus

Each line is verified in Task 5's manual checklist.

1. Saving a task with no device selected (empty `devices`, or select untouched) must be blocked by the inline error, never inserted with `device_id` 0/null.
2. Editing a task without touching the image inputs must keep the stored image URLs, not overwrite them with `''`/`null`.
3. An image upload failure must alert, keep the modal open with the typed values, and must not insert a task.
4. Deleting a device that has tasks must show the warning and remove the related tasks; without the cascade SQL applied, the delete must fail with an alert and leave the device in place.
5. A task whose `device_id` no longer resolves to a device must render "—" in the Thiết bị column instead of crashing.

---

### Task 1: Cascade FK, Task type, permission, and data layer

**Files:**
- Modify: `supabase/schema.sql` (the `fk_tasks_device` block after the `tasks` table)
- Modify: `lib/constants.ts` (`CHUC_NANG_LIST` at lines 17-28; new interface after `Device`)
- Modify: `lib/db.ts` (new section after `DEVICES`, before `HISTORY LOG`; mapper next to `mapDeviceFromDB`; header table list)

**Interfaces:**
- Produces (all exported):
  - `interface Task { id: number; deviceId: number; taskName: string; taskDescription: string; imageBefore: string; imageAfter: string; expiredAt: string; createdAt: string; updatedAt: string }`
  - `getTasks(): Promise<Task[]>`
  - `createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null>`
  - `updateTask(id: number, updates: Partial<Task>): Promise<boolean>`
  - `deleteTask(id: number): Promise<boolean>`
  - Permission id `'quan-ly-cong-viec'` present in `CHUC_NANG_LIST`

- [ ] **Step 1: Make the tasks FK cascade**

Replace the current `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_device ...` block with:

```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_device;
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_device
FOREIGN KEY (device_id)
REFERENCES devices(id) ON DELETE CASCADE;
```

Leave the rest of the file untouched. Remind the user to run this block in the Supabase SQL Editor (the app cannot apply it).

- [ ] **Step 2: Add the `Task` interface to `lib/constants.ts`**

Insert after the `Device` interface, with a Vietnamese section comment:

```ts
export interface Task {
  id: number
  deviceId: number
  taskName: string
  taskDescription: string
  imageBefore: string
  imageAfter: string
  expiredAt: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Add the permission to `CHUC_NANG_LIST`**

Append after the `quan-ly-thiet-bi` entry (keep commas correct):

```ts
  { id: 'quan-ly-cong-viec', name: 'Quản lý công việc', description: 'Có thể xem/thêm/sửa/xóa công việc' },
```

- [ ] **Step 4: Add task functions to `lib/db.ts`**

Add before the `HISTORY LOG` section. Each function logs via `console.error` and returns the same failure value the existing functions use (`[]`, `null`, `false`):

- `getTasks` — `.from('tasks').select('*').order('created_at', { ascending: false })`, map rows with `mapTaskFromDB`.
- `createTask` — insert `{ device_id, task_name, task_description, image_before_maintenance_url, image_after_maintenance_url: imageAfter || null, expired_at }` (trimmed strings), `.select().single()`, return mapped row or `null`.
- `updateTask` — build a snake_case object only for defined keys (`deviceId`→`device_id`, `taskName`→`task_name`, `taskDescription`→`task_description`, `imageBefore`→`image_before_maintenance_url`, `imageAfter`→`image_after_maintenance_url` with `|| null`, `expiredAt`→`expired_at`), always set `updated_at: new Date().toISOString()`, `.update(...).eq('id', id)`, return `true`/`false`.
- `deleteTask` — `.delete().eq('id', id)`, return `true`/`false`.

- [ ] **Step 5: Add `mapTaskFromDB`**

Next to `mapDeviceFromDB`:

```ts
function mapTaskFromDB(row: any): Task {
  return {
    id: row.id,
    deviceId: row.device_id,
    taskName: row.task_name || '',
    taskDescription: row.task_description || '',
    imageBefore: row.image_before_maintenance_url || '',
    imageAfter: row.image_after_maintenance_url || '',
    expiredAt: row.expired_at || '',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString('vi-VN') : '',
  }
}
```

Update the file's header comment list of tables to include `tasks`.

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: build completes with no error. (TS errors are ignored by config; re-read the new signatures against the `Task` interface.)

- [ ] **Step 7: Commit**

```bash
git add supabase/schema.sql lib/constants.ts lib/db.ts
git commit -m "feat: add task type, permission, data layer, and cascade FK"
```

---

### Task 2: `/tasks` page

**Files:**
- Create: `app/tasks/page.tsx`

**Interfaces:**
- Consumes: `Task`, `Device` from `@/lib/constants`; `getTasks`, `createTask`, `updateTask`, `deleteTask`, `getDevices`, `uploadImage` from `@/lib/db` (Task 1 and existing helpers).

**Permission rule (used in the gate):** `const canManage = !!user && (user.isAdmin || (Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']).includes('quan-ly-cong-viec'))`.

- [ ] **Step 1: Scaffold the page shell, session, load, and list**

`'use client'`. Copy the outer structure and styling from `app/devices/page.tsx` (lines 155-196): `<Sidebar />`, `flex-1 md:ml-64`, `p-4 md:p-8 bg-gray-50 min-h-screen`, `h1` "Quản Lý Công Việc", one `Card` with `border-l-4 border-l-blue-600`.

State: `user`, `tasks: Task[]`, `devices: Device[]`, `loading`, `searchTerm`, `isModalOpen`, `editingTask: Task | null`, `isSaving`, `formData` (`deviceId: string`, `taskName`, `taskDescription`, `expiredAt`), `imageBeforeFile: File | null`, `imageAfterFile: File | null`, `formErrors: Partial<Record<'deviceId' | 'taskName' | 'taskDescription' | 'expiredAt' | 'imageBefore' | 'imageAfter', string>>`.

On mount: read `localStorage.getItem('user')`; if absent `window.location.href = '/'`; else `setUser(parsed)` and load both lists (`setLoading` around `Promise.all([getTasks(), getDevices()])`).

Render, inside the card:
- `CardTitle` "Danh Sách Công Việc" with a `ClipboardList` icon; "Thêm Công Việc" `Button` (blue, `Plus` icon) rendered only when `canManage`.
- Search `Input` with `Search` icon: placeholder "Tìm kiếm theo tên công việc hoặc thiết bị..."; filter case-insensitively on `taskName` or the resolved device name (`devices.find(d => d.id === t.deviceId)?.name || ''`).
- Table headers: Thiết bị, Tên công việc, Mô tả, Ngày tạo, and "Thao tác" only when `canManage`. No image or deadline columns.
- Body states: `loading` → "Đang tải..."; empty → "Không có công việc nào"; each row shows the resolved device name (or "—" when it does not resolve), task name (`font-medium`), description truncated with `slice(0, 80)` + `…` when longer, `createdAt`, and, when `canManage`, edit (`Edit2`) and delete (`Trash2`) icon buttons.
- `colSpan` equals 5 with actions, 4 without.
- When `user` is set and `!canManage`, render a permission `Card` with `AlertCircle` and text "Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên." instead of the list card.
- Return "Loading..." while `!user`.

- [ ] **Step 2: Add the shared add/edit modal**

One modal rendered when `isModalOpen`. Title `editingTask ? 'Sửa Công Việc' : 'Thêm Công Việc'`; `X` close button.

Fields in order:
1. Thiết bị — `<select>` bound to `formData.deviceId`; options from `devices` with `value={String(d.id)}` and label `${d.deviceId} — ${d.name}`; first option `value=""` "Chọn thiết bị". Required. When `devices.length === 0`, show `<p className="text-amber-600 text-xs mt-1">Chưa có thiết bị nào. Vui lòng thêm thiết bị trước.</p>`.
2. Tên công việc — `Input`, required.
3. Mô tả — `<textarea>` styled like `Input` (`border-2 rounded-md p-2 w-full min-h-24`), required.
4. Ảnh trước — `<input type="file" accept="image/*">`, required on create only. When editing and `editingTask.imageBefore` exists, show a 16×16 `img` preview above the input.
5. Ảnh sau — `<input type="file" accept="image/*">`, optional; same preview rule for `editingTask.imageAfter`.
6. Hạn hoàn thành — `<input type="date">` styled like `Input`, required.

All labels except Ảnh sau suffixed `*`. Each field gets the red border/background when its key exists in `formErrors`, and the `⚠️ {error}` line below. Every `onChange` clears its own `formErrors` key (file inputs clear `imageBefore` / `imageAfter`).

`handleAdd`: reset `editingTask` to `null`, `formData` to `{ deviceId: '', taskName: '', taskDescription: '', expiredAt: '' }`, both files `null`, `formErrors` empty, `isSaving` false, open.
`handleEdit(task)`: copy `deviceId` as `String(task.deviceId)`, `taskName`, `taskDescription`, `expiredAt.slice(0, 10)`, set `editingTask`, reset files and errors, open.

`validate()` returns errors for empty `deviceId` ("Vui lòng chọn thiết bị"), `taskName` ("Vui lòng nhập tên công việc"), `taskDescription` ("Vui lòng nhập mô tả"), `expiredAt` ("Vui lòng chọn hạn hoàn thành"), plus `imageBefore` ("Vui lòng chọn ảnh trước") only when `!editingTask && !imageBeforeFile`.

- [ ] **Step 3: Save with image upload**

`handleSave`:
1. If `isSaving`, return. Run `validate()`; if any errors, `setFormErrors(errors)` and return.
2. `setIsSaving(true)` in a `try`.
3. Upload only the newly picked files: `imageBeforeFile && await uploadImage(imageBeforeFile, 'tasks')`, same for `imageAfterFile`. If either returns `null`, `alert('❌ Upload ảnh thất bại! Vui lòng thử lại.')` and return (modal stays open, nothing inserted).
4. Build values: `deviceId: Number(formData.deviceId)`, trimmed `taskName` / `taskDescription`, `expiredAt`, `imageBefore: uploadedBefore ?? editingTask?.imageBefore ?? ''`, `imageAfter: uploadedAfter ?? editingTask?.imageAfter ?? ''`.
5. `updateTask(editingTask.id, values)` when editing, else `createTask(values)`; on `false`/`null` `alert('❌ Lưu thất bại! Vui lòng thử lại.')` and return.
6. On success: reload both lists, close the modal.
7. `finally { setIsSaving(false) }`.

Footer: "Hủy" `Button variant="outline"` closing the modal; save `Button` labelled `editingTask ? 'Cập Nhật' : 'Tạo Mới'`, `disabled={isSaving}`.

- [ ] **Step 4: Add delete**

`handleDelete(task)`: `confirm(\`Bạn có chắc chắn muốn xóa công việc "${task.taskName}"?\`)`; on yes `const ok = await deleteTask(task.id)`; if `!ok` alert `'❌ Xóa thất bại! Vui lòng thử lại.'`; else reload the tasks list.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: completes with no error and lists `/tasks` in the route output.

- [ ] **Step 6: Commit**

```bash
git add app/tasks/page.tsx
git commit -m "feat: add task management page"
```

---

### Task 3: Sidebar menu item

**Files:**
- Modify: `components/sidebar.tsx` (imports line 24; `MENU_ITEMS` lines 33-40)

**Interfaces:**
- Consumes: permission id `'quan-ly-cong-viec'` from Task 1; the existing `permission?` filter already handles visibility.

- [ ] **Step 1: Add the menu entry**

Add `ClipboardList` to the `lucide-react` import, then insert after the `devices` entry:

```ts
  { id: 'tasks', label: 'Quản Lý Công Việc', icon: ClipboardList, href: '/tasks', permission: 'quan-ly-cong-viec' },
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no error.

- [ ] **Step 3: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add task management menu item"
```

---

### Task 4: Device delete warning

**Files:**
- Modify: `app/devices/page.tsx` (`handleDelete`, lines 127-135)
- Modify: `docs/specs/device.md` (Delete paragraph, line 82)

- [ ] **Step 1: Extend the confirm message**

Replace the confirm string in `handleDelete` with:

```ts
if (!confirm(`Bạn có chắc chắn muốn xóa "${device.name}"?\n\nLưu ý: Xóa thiết bị này, các mục công việc liên quan cũng sẽ bị xóa ở trang Quản Lý Thiết Bị`)) return
```

No other change: the cascade FK from Task 1 does the work.

- [ ] **Step 2: Update the device spec**

Change the Delete paragraph to state that the confirm also warns related tasks will be deleted, and that the `tasks` FK cascades.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: completes with no error.

- [ ] **Step 4: Commit**

```bash
git add app/devices/page.tsx docs/specs/device.md
git commit -m "feat: warn that deleting a device also deletes its tasks"
```

---

### Task 5: End-to-end verification and spec sync

**Files:**
- Modify (only if behavior changed): `docs/specs/task.md`, `docs/specs/device.md`

- [ ] **Step 1: Apply the cascade SQL**

Run the Task 1 SQL block in the Supabase SQL Editor.
Expected: `ALTER TABLE` succeeds; deleting a device with tasks no longer violates the FK.

- [ ] **Step 2: Start the app and sign in as admin**

Run: `npm run dev`, open `http://localhost:3000`, sign in with the admin account from `supabase/schema.sql`.
Expected: sidebar shows "Quản Lý Công Việc".

- [ ] **Step 3: Walk the checklist**

- Create a task: pick a device, enter name/description, ảnh trước, deadline. It appears with the device name and "Ngày tạo" filled.
- Submit with nothing filled: all inline errors show, nothing is saved (Review Focus 1).
- Edit the task, change only the name, save: the stored ảnh trước is unchanged in the modal preview (Review Focus 2).
- Edit again, add ảnh sau, save: modal shows the new ảnh sau preview; list still shows no image columns.
- Search by partial task name and partial device name; rows filter correctly.
- Break the bucket name or go offline, try a save with a new image: alert appears, modal keeps values, no task is inserted (Review Focus 3). Restore afterwards.
- Delete the test task: confirm dialog, row disappears.
- Create a task on device A, then delete device A from `/devices`: the warning appears, the device and its task disappear (Review Focus 4).
- Paste `<script>alert(1)</script>` into Tên công việc and Mô tả; the table shows it literally and no alert fires.
- Sign in as a non-admin account without `quan-ly-cong-viec`: menu item absent; `http://localhost:3000/tasks` shows the permission message with no buttons.
- Temporarily remove a task's device row in the Supabase table editor (FK off in a scratch DB) and reload `/tasks`: the Thiết bị column shows "—" (Review Focus 5).

- [ ] **Step 4: Update the spec if behavior changed**

If any implemented behavior differs from `docs/specs/task.md` or `docs/specs/device.md` (labels, validation messages, permission rule, delete behavior), edit the spec to match, then note the change in the commit message.

- [ ] **Step 5: Commit any spec change**

```bash
git add docs/specs/task.md docs/specs/device.md
git commit -m "docs: sync task and device specs with implementation"
```

(Skip the commit when nothing changed.)
