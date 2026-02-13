import { useProjects } from "@/hooks/use-projects";
import { Link } from "react-router-dom";
import { Globe, ArrowRight, Plus, Loader2 } from "lucide-react";
import { StatusDot } from "@/components/StatusDot";
import { motion } from "framer-motion";

const Projects = () => {
  const { data: projects, isLoading } = useProjects();

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
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project, i) => (
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
                    <StatusDot status={project.status as any} />
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{project.start_url}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No projects yet.</p>
        </div>
      )}
    </div>
  );
};

export default Projects;
