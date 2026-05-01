## Goal
Remove the admin-only restriction so any signed-in user can create projects (and add tasks to projects they belong to). Admin role is preserved for managing members and other users' content.

## Changes

### 1. Database migration (RLS policy updates)
- **`projects` table** — replace `Projects: admins create` policy:
  - New: any authenticated user can insert a project as long as `created_by = auth.uid()`.
- **`tasks` table** — replace `Tasks: admins/creators insert` policy:
  - New: any project member (or admin, or project creator) can insert a task in projects they belong to, with `created_by = auth.uid()`.
- Keep update/delete policies as-is (admins and project creators retain elevated control; assignees can still update their own tasks).

### 2. Frontend — `src/pages/Projects.tsx`
- Remove the `isAdmin` gate around the "New project" button and dialog so the button shows for everyone.
- Keep the per-project delete button admin-only (RLS still enforces it; project creators can also delete their own).

### 3. Frontend — `src/pages/ProjectDetail.tsx`
- Remove any `isAdmin` gate on the "Add task" / new-task UI so members can create tasks in projects they're part of. (Will verify exact gating when editing.)

## Result
- Any signed-up user can create a project (they auto-become its creator + member).
- Members can add tasks to projects they belong to.
- Admin role still controls: managing members across all projects, deleting/updating others' projects, role assignment.
