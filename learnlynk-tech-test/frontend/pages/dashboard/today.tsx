import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    setLoading(true);
    setError(null);

    try {
      // TODO:
      // - Query tasks that are due today and not completed
      // - Use supabase.from("tasks").select(...)
      // - You can do date filtering in SQL or client-side

      // Example:
      // const { data, error } = await supabase
      //   .from("tasks")
      //   .select("*")
      //   .eq("status", "open");

      const now = new Date();
      // Start of day: 00:00:00
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      // End of day: 23:59:59
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      // 2. Query Supabase
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // Filter: Status is NOT 'completed'
        .neq("status", "completed")
        // Filter: due_at is greater than or equal to start of today
        .gte("due_at", startOfDay)
        // Filter: due_at is less than or equal to end of today
        .lte("due_at", endOfDay)
        // Order by due date soonest
        .order("due_at", { ascending: true });

      if (error) throw error;
      setTasks(data||[]);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    try {
      // TODO:
      // - Update task.status to 'completed'
      // - Re-fetch tasks or update state optimistically
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;

      // 2. Optimistic Update (Remove from UI immediately)
      // This makes the UI feel faster than waiting for a re-fetch
      setTasks((prev) => prev.filter((task) => task.id !== id));

    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Today&apos;s Tasks</h1>
      {tasks.length === 0 && <p>No tasks due today 🎉</p>}

      {tasks.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "8px" }}>Type</th>
              <th style={{ padding: "8px" }}>Application</th>
              <th style={{ padding: "8px" }}>Due At</th>
              <th style={{ padding: "8px" }}>Status</th>
              <th style={{ padding: "8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px", textTransform: "capitalize" }}>{t.type}</td>
                <td style={{ padding: "8px" }}>{t.application_id}</td>
                <td style={{ padding: "8px" }}>{new Date(t.due_at).toLocaleTimeString()}</td>
                <td style={{ padding: "8px" }}>{t.status}</td>
                <td style={{ padding: "8px" }}>
                  <button 
                    onClick={() => markComplete(t.id)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px"
                    }}
                  >
                    Mark Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
