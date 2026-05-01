-- Allow any authenticated user to create projects (must set themselves as creator)
DROP POLICY IF EXISTS "Projects: admins create" ON public.projects;
CREATE POLICY "Projects: authenticated create"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow project members (and admins/creators) to add tasks to projects they belong to
DROP POLICY IF EXISTS "Tasks: admins/creators insert" ON public.tasks;
CREATE POLICY "Tasks: members insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_project_member(project_id, auth.uid())
  )
);