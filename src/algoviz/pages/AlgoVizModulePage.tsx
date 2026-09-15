import { ArrowLeft, Construction, GitCompareArrows, Route, Search, Sigma } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const moduleContent = {
  search: {
    icon: Search,
    name: "Search algorithms",
    description: "A visual home for BFS, DFS, and Greedy Best-First Search.",
    detail: "The graph engine and execution contract are being established first. Algorithms will arrive as deterministic step generators in the next milestones.",
  },
  pathfinding: {
    icon: Route,
    name: "Pathfinding",
    description: "A place to study distance, heuristics, and shortest paths.",
    detail: "This surface is reserved for Dijkstra and A*. The same execution data will power animation, explanation, and comparison metrics.",
  },
  sorting: {
    icon: Sigma,
    name: "Sorting algorithms",
    description: "A future workspace for comparisons, swaps, and array state.",
    detail: "Sorting follows the graph foundation. The playback contract already supports the same step-by-step interaction model.",
  },
  compare: {
    icon: GitCompareArrows,
    name: "Compare algorithms",
    description: "Run two algorithms against the same input and see the difference.",
    detail: "Compare Mode will use actual execution steps and deterministic operation counts. It will never invent performance numbers.",
  },
} as const;

export default function AlgoVizModulePage() {
  const location = useLocation();
  const key = location.pathname.split("/").filter(Boolean).at(-1) as keyof typeof moduleContent;
  const module = moduleContent[key] ?? moduleContent.search;
  const Icon = module.icon;

  return (
    <div className="algoviz-page algoviz-module-page">
      <section className="algoviz-module-hero">
        <Link className="algoviz-back-link" to="/algoviz"><ArrowLeft size={16} /> Back to Learn</Link>
        <span className="algoviz-module-icon" aria-hidden="true"><Icon size={28} /></span>
        <p className="algoviz-eyebrow">Module foundation</p>
        <h1>{module.name}</h1>
        <p className="algoviz-module-lede">{module.description}</p>
      </section>
      <section className="algoviz-module-state" aria-labelledby="module-state-heading">
        <Construction size={22} aria-hidden="true" />
        <div>
          <h2 id="module-state-heading">The lab is taking shape.</h2>
          <p>{module.detail}</p>
          <span className="algoviz-planned-badge">Planned for a future milestone</span>
        </div>
      </section>
    </div>
  );
}
