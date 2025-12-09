// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // TODO: validate application_id, task_type, due_at
    // - check task_type in VALID_TYPES
    // - parse due_at and ensure it's in the future


    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: application_id, task_type, due_at" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check task_type is valid
    if (!VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid task_type. Must be: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate due_at (Must be in the future)
    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid due_at timestamp format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }


    // TODO: insert into tasks table using supabase client

    // Example:
    // const { data, error } = await supabase
    //   .from("tasks")
    //   .insert({ ... })
    //   .select()
    //   .single();

    // TODO: handle error and return appropriate status code

    const { data: appData, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !appData) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Example successful response:
    // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" },
    // });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        tenant_id: appData.tenant_id, // inherited from application
        application_id: application_id,
        type: task_type,
        title: `New ${task_type} task`,
        due_at: due_at,
        status: "open"
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB Insert Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create task" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }


    const channel = supabase.channel('system');
    
    await channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'task.created',
          payload: { 
            task_id: data.id, 
            application_id: application_id,
            type: task_type 
          },
        });
        // Clean up channel after sending
        supabase.removeChannel(channel);
      }
    });


    return new Response(
      JSON.stringify({ success: true, task_id: data.id }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
