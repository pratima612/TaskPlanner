import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, isBefore } from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useAuth } from "@/contexts/AuthContext";
import { useProject, useProjectMembers, useAddMemberByEmail, useRemoveMember } from "@/hooks/useProjects";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, Task, TaskStatus } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, UserPlus, X, Calendar, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

const COLUMNS: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "todo", label: "To do", tone: "bg-muted-foreground" },
  { id: "in_progress", label: "In progress", tone: "bg-info" },
  { id: "done", label: "Done", tone: "bg-success" },
];

function TaskCard({ task, members, onDelete, canManage }: {
  task: Task;
  members: { user_id: string; profile?: { display_name: string | null; email: string } }[];
  onDelete: () => void;
  canManage: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  const assignee = members.find((m) => m.user_id === task.assigned_to)?.profile;
  const initials = (assignee?.display_name || assignee?.email || "?").slice(0, 2).toUpperCase();
  const overdue = task.deadline && task.status !== "done" && isBefore(new Date(task.deadline), new Date());

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className="surface border-border/60 p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors group shadow-card">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
          {canManage && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.deadline && (
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 px-1.5 py-0 h-5 ${overdue ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground"}`}
              >
                {overdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
                {format(new Date(task.deadline), "MMM d")}
              </Badge>
            )}
          </div>
          {assignee && (
            <Avatar className="h-6 w-6 border border-border">
              <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </Card>
    </div>
  );
}

const Column = ({ id, label, tone, tasks, members, onDelete, canManage }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 min-h-[400px] transition-colors ${isOver ? "border-primary/60 bg-accent/20" : "border-border/60 bg-card/40"}`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t: Task) => (
          <TaskCard key={t.id} task={t} members={members} onDelete={() => onDelete(t.id)} canManage={canManage} />
        ))}
      </div>
    </div>
  );
};

const taskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  assigned_to: z.string().optional(),
  deadline: z.string().optional(),
});

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const { data: project, isLoading: pLoading } = useProject(id);
  const { data: members = [] } = useProjectMembers(id);
  const { data: tasks = [], isLoading: tLoading } = useTasks({ projectId: id });
  const createTask = useCreateTask(id!);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addMember = useAddMemberByEmail(id!);
  const removeMember = useRemoveMember(id!);

  const isProjectOwner = !!user && project?.created_by === user.id;
  const isMember = !!user && members.some((m) => m.user_id === user.id);
  const canManageMembers = isAdmin || isProjectOwner;
  const canManage = canManageMembers || isMember;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => grouped[t.status].push(t));
    return grouped;
  }, [tasks]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const newStatus = String(overId) as TaskStatus;
    if (!["todo", "in_progress", "done"].includes(newStatus)) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    updateTask.mutate({ id: taskId, patch: { status: newStatus } });
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = taskSchema.safeParse({
      title: fd.get("title"),
      description: fd.get("description") || undefined,
      assigned_to: fd.get("assigned_to") || undefined,
      deadline: fd.get("deadline") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    await createTask.mutateAsync({
      title: parsed.data.title,
      description: parsed.data.description,
      assigned_to: parsed.data.assigned_to && parsed.data.assigned_to !== "none" ? parsed.data.assigned_to : null,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString() : null,
    });
    setTaskOpen(false);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    if (!email) return;
    await addMember.mutateAsync(email);
    (e.target as HTMLFormElement).reset();
  };

  if (pLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Project not found or you don't have access.</p>
        <Button asChild variant="link"><Link to="/projects">Back to projects</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-semibold tracking-tight truncate">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManageMembers && (
            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="soft"><UserPlus className="h-4 w-4" /> Members</Button>
              </DialogTrigger>
              <DialogContent className="surface border-border/60">
                <DialogHeader><DialogTitle>Project members</DialogTitle></DialogHeader>
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <Input name="email" type="email" placeholder="user@email.com" required />
                  <Button type="submit" variant="hero" disabled={addMember.isPending}>Add</Button>
                </form>
                <ul className="space-y-2 mt-2 max-h-72 overflow-auto">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-2 rounded-md bg-accent/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{(m.profile?.display_name || m.profile?.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.profile?.display_name || m.profile?.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
                        </div>
                      </div>
                      {m.user_id !== project.created_by && (
                        <Button size="icon" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          )}
          {canManage && (
            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="hero"><Plus className="h-4 w-4" /> New task</Button>
              </DialogTrigger>
              <DialogContent className="surface border-border/60">
                <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Assignee</Label>
                      <Select name="assigned_to" defaultValue="none">
                        <SelectTrigger id="assigned_to"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profile?.display_name || m.profile?.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input id="deadline" name="deadline" type="date" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="hero" disabled={createTask.isPending}>
                      {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {tLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                label={col.label}
                tone={col.tone}
                tasks={tasksByStatus[col.id]}
                members={members}
                onDelete={(taskId: string) => deleteTask.mutate(taskId)}
                canManage={canManage}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <Card className="surface border-primary/60 p-3 shadow-glow rotate-2">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
