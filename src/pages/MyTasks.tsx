import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isBefore } from "date-fns";
import { useTasks, useUpdateTask, TaskStatus } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, AlertTriangle, ListChecks } from "lucide-react";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};
const STATUS_TONE: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-info/15 text-info border-info/30",
  done: "bg-success/15 text-success border-success/30",
};

export default function MyTasks() {
  const { data: tasks = [], isLoading } = useTasks({ assignedToMe: true });
  const { data: projects = [] } = useProjects();
  const update = useUpdateTask();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter],
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">My tasks</h1>
          <p className="text-muted-foreground mt-1">Tasks assigned to you across all projects.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">To do</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? null : filtered.length === 0 ? (
        <Card className="surface border-border/60 border-dashed p-12 text-center shadow-card">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold">Nothing to do</h3>
          <p className="text-muted-foreground text-sm mt-1">No tasks match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = t.deadline && t.status !== "done" && isBefore(new Date(t.deadline), new Date());
            return (
              <Card key={t.id} className="surface border-border/60 p-4 flex items-center gap-4 shadow-card hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/projects/${t.project_id}`} className="text-xs text-muted-foreground hover:text-foreground">
                      {projectName(t.project_id)}
                    </Link>
                    {overdue && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-destructive/60 text-destructive">
                        <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium mt-0.5 truncate">{t.title}</p>
                  {t.deadline && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {format(new Date(t.deadline), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`${STATUS_TONE[t.status]} capitalize`}>
                  {STATUS_LABELS[t.status]}
                </Badge>
                <Select
                  value={t.status}
                  onValueChange={(v) => update.mutate({ id: t.id, patch: { status: v as TaskStatus } })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To do</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
