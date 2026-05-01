import { useMemo } from "react";
import { useAllTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, FolderKanban } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: any;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  };
  return (
    <Card className="surface border-border/60 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className={`text-3xl font-display font-semibold mt-2 ${toneClass[tone]}`}>{value}</p>
        </div>
        <div className="h-9 w-9 rounded-md bg-accent/40 flex items-center justify-center">
          <Icon className={`h-4 w-4 ${toneClass[tone]}`} />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const { data: tasks = [] } = useAllTasks();
  const { data: projects = [] } = useProjects();

  const stats = useMemo(() => {
    const now = new Date();
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const pending = tasks.filter((t) => t.status !== "done").length;
    const overdue = tasks.filter(
      (t) => t.deadline && t.status !== "done" && new Date(t.deadline) < now,
    ).length;
    return { total, done, pending, overdue };
  }, [tasks]);

  const chartData = useMemo(() => {
    return [
      { name: "To do", value: tasks.filter((t) => t.status === "todo").length, color: "hsl(var(--muted-foreground))" },
      { name: "In progress", value: tasks.filter((t) => t.status === "in_progress").length, color: "hsl(var(--info))" },
      { name: "Done", value: tasks.filter((t) => t.status === "done").length, color: "hsl(var(--success))" },
    ];
  }, [tasks]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Welcome back<span className="text-muted-foreground">, {user?.email?.split("@")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {role === "admin" ? "You're an admin — you can create projects and manage members." : "Member workspace overview."}
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total tasks" value={stats.total} icon={ListTodo} />
        <StatCard label="Completed" value={stats.done} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="surface border-border/60 p-5 lg:col-span-2 shadow-card">
          <h2 className="font-display text-lg font-semibold mb-4">Tasks by status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface border-border/60 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Projects</h2>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="block px-3 py-2 rounded-md hover:bg-accent/40 transition-colors text-sm"
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
