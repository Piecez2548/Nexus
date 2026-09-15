import { ArrowRight, BarChart3, BookOpen, GitCompareArrows, Play, Route } from "lucide-react";
import { Link } from "react-router-dom";

import type { AlgorithmDefinition } from "@/algorithms/shared/types";

const categories: AlgorithmDefinition[] = [
  {
    id: "search",
    name: "Search",
    category: "search",
    summary: "Trace how a graph is explored, one decision at a time.",
    status: "planned",
  },
  {
    id: "pathfinding",
    name: "Pathfinding",
    category: "pathfinding",
    summary: "See distance, heuristics, and shortest paths evolve in real time.",
    status: "planned",
  },
  {
    id: "sorting",
    name: "Sorting",
    category: "sorting",
    summary: "Watch comparisons and swaps turn an array into order.",
    status: "planned",
  },
];

function ExecutionPreview() {
  return (
    <div className="algoviz-preview" aria-label="Illustrative graph execution preview">
      <div className="algoviz-preview-toolbar">
        <span><span className="algoviz-live-dot" aria-hidden="true" /> Execution surface</span>
        <span className="algoviz-preview-step">Step 04 <span>/</span> 12</span>
      </div>
      <div className="algoviz-preview-body">
        <div className="algoviz-graph" aria-hidden="true">
          <svg className="algoviz-graph-lines" viewBox="0 0 480 280" preserveAspectRatio="none">
            <path d="M84 65 L238 44 L392 84 M84 65 L160 188 L302 156 L392 84 M160 188 L302 236 L392 84" />
          </svg>
          <span className="algoviz-node node-a">A</span>
          <span className="algoviz-node node-b is-current">B</span>
          <span className="algoviz-node node-c is-frontier">C</span>
          <span className="algoviz-node node-d is-visited">D</span>
          <span className="algoviz-node node-e is-goal">E</span>
        </div>
        <aside className="algoviz-step-note">
          <span className="algoviz-note-label">Current action</span>
          <strong>Visiting B</strong>
          <p>B is the next node in the queue. Its neighbors are added to the frontier for the next level.</p>
          <div className="algoviz-note-meta"><span>Queue</span><code>[C, D]</code></div>
        </aside>
      </div>
      <div className="algoviz-preview-controls" aria-hidden="true">
        <button type="button" tabIndex={-1}><span>←</span></button>
        <button type="button" className="is-play" tabIndex={-1}><Play size={15} fill="currentColor" /></button>
        <button type="button" tabIndex={-1}><span>→</span></button>
        <span className="algoviz-control-rule" />
        <span>Speed <b>1×</b></span>
      </div>
    </div>
  );
}

export default function AlgoVizHomePage() {
  return (
    <div className="algoviz-page algoviz-home-page">
      <section className="algoviz-hero">
        <div className="algoviz-hero-copy">
          <p className="algoviz-eyebrow">Interactive algorithm lab <span aria-hidden="true">/</span> 01</p>
          <h1>See algorithms <em>think.</em></h1>
          <p className="algoviz-hero-lede">Explore algorithms step by step and understand not only what they do, but why they do it.</p>
          <div className="algoviz-hero-actions">
            <Link className="algoviz-button algoviz-button-primary" to="/algoviz/search">Start visualizing <ArrowRight size={17} /></Link>
            <Link className="algoviz-button algoviz-button-secondary" to="/algoviz/compare"><GitCompareArrows size={17} /> Compare algorithms</Link>
          </div>
          <p className="algoviz-hero-footnote"><span aria-hidden="true">↳</span> No sign-up. No backend. Just the next step.</p>
        </div>
        <ExecutionPreview />
      </section>

      <section className="algoviz-section algoviz-explore-section" id="explore" aria-labelledby="explore-heading">
        <div className="algoviz-section-heading">
          <div>
            <p className="algoviz-eyebrow">Choose your lens</p>
            <h2 id="explore-heading">Start with a question.</h2>
          </div>
          <p>Every visualization will expose the decision, the data structure behind it, and the change it caused.</p>
        </div>
        <div className="algoviz-category-list">
          {categories.map((category, index) => (
            <Link className="algoviz-category-row" to={`/algoviz/${category.category}`} key={category.id}>
              <span className={`algoviz-category-icon icon-${category.category}`} aria-hidden="true">
                {index === 0 && <BookOpen size={20} />}
                {index === 1 && <Route size={20} />}
                {index === 2 && <BarChart3 size={20} />}
              </span>
              <span className="algoviz-category-index">0{index + 1}</span>
              <span className="algoviz-category-copy"><strong>{category.name}</strong><span>{category.summary}</span></span>
              <span className="algoviz-category-status">{category.status === "planned" ? "Planned · foundation ready" : "Available"} <ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="algoviz-workflow-section" aria-labelledby="workflow-heading">
        <div className="algoviz-workflow-intro">
          <p className="algoviz-eyebrow">The learning loop</p>
          <h2 id="workflow-heading">From curiosity to clarity.</h2>
          <p>AlgoViz is built around the moment an abstract rule finally becomes a visible decision.</p>
        </div>
        <ol className="algoviz-workflow-list">
          {['Choose', 'Visualize', 'Step through', 'Understand', 'Compare'].map((step, index) => (
            <li key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
              {index < 4 && <ArrowRight size={17} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
