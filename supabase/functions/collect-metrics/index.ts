// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body for optional target_date parameter
    let targetDate: string | undefined;
    try {
      const body = await req.json();
      targetDate = body.target_date;
    } catch {
      // No body or invalid JSON - use default (current date)
    }

    console.log(
      `Starting metric collection${
        targetDate ? ` for date: ${targetDate}` : ""
      }`
    );

    // Call the collect_daily_metrics RPC function
    const { data, error } = await supabase.rpc(
      "collect_daily_metrics",
      targetDate ? { target_date: targetDate } : {}
    );

    if (error) {
      console.error("Error collecting metrics:", error);
      throw error;
    }

    console.log("Metric collection completed successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: "Metrics collected successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Fatal error in collect-metrics function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
