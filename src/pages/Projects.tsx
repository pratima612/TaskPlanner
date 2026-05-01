import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, FolderKanban, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
  description: z.string().trim().max(500).optional(),
});

export default function Projects() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: projects = [], isLoading } = useProjects();
  const create = useCreateProject();
  const del = useDeleteProject();
  const [open, setOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      description: fd.get("description") || undefined,
    });
    if (!parsed.success) return;
    await create.mutateAsync({ name: parsed.data.name, description: parsed.data.description });
    setOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">All projects you have access to.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent className="surface border-border/60">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" maxLength={500} rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero" disabled={create.isPending}>
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="surface border-border/60 border-dashed p-12 text-center shadow-card">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create your first project to get started.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="surface border-border/60 p-5 group hover:border-primary/40 transition-colors shadow-card">
              <Link to={`/projects/${p.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-md bg-gradient-primary flex items-center justify-center shadow-glow">
                    <FolderKanban className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold truncate">{p.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                  {p.description || "No description"}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(p.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </Link>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete "${p.name}"? This will remove all its tasks.`)) del.mutate(p.id);
                  }}
                  style={{ top: 12, right: 12, position: "absolute" }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
