import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useTasks(opts?: { projectId?: string; assignedToMe?: boolean }) {
  return useQuery({
    queryKey: ["tasks", opts ?? {}],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (opts?.projectId) q = q.eq("project_id", opts.projectId);
      if (opts?.assignedToMe) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) q = q.eq("assigned_to", u.user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      assigned_to?: string | null;
      deadline?: string | null;
      status?: TaskStatus;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title: input.title,
          description: input.description ?? null,
          assigned_to: input.assigned_to ?? null,
          deadline: input.deadline ?? null,
          status: input.status ?? "todo",
          created_by: u.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
