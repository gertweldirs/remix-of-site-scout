import { demoProjects } from "@/lib/demo-data";
import { Link } from "react-router-dom";
import { Globe, ArrowRight, Plus, Loader2 } from "lucide-react";
import { StatusDot } from "@/components/StatusDot";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Projects = () => {
  const { data: dbProjects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Merge: real projects first, then demo projects (if no real ones)
  const allProjects = dbProjects && dbProjects.length > 0
    ? dbProjects.map(p => ({
        id: p.id,
        name: p.name,
        startUrl: p.start_url,
        status: p.status as any,
        createdAt: p.created_at,
        isDemo: false,
      }))
    : demoProjects.map(p => ({
        id: p.id,
        name: p.name,
        startUrl: p.startUrl,
        status: p.status,
        createdAt: p.createdAt,
        isDemo: true,
      }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your inspection targets</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {allProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/projects/${project.id}`}
                className="flex items-center gap-4 px-5 py-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={project.status} />
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                    {project.isDemo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DEMO</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{project.startUrl}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
