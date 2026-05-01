import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: input.name, description: input.description ?? null, created_by: uid })
        .select()
        .single();
      if (error) throw error;
      // auto-add creator as member
      await supabase.from("project_members").insert({ project_id: data.id, user_id: uid });
      return data as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  added_at: string;
  profile?: { display_name: string | null; email: string };
};

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;

      const userIds = (data ?? []).map((m) => m.user_id);
      if (userIds.length === 0) return [] as ProjectMember[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      return (data ?? []).map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.id === m.user_id) ?? undefined,
      })) as ProjectMember[];
    },
  });
}

export function useAddMemberByEmail(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("No user with that email. Ask them to sign up first.");
      const { error } = await supabase
        .from("project_members")
        .insert({ project_id: projectId, user_id: profile.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast.success("Member added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast.success("Member removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
