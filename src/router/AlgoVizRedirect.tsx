import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// AlgoViz is developed and deployed as its own site; Nexus only links to it.
export const ALGOVIZ_URL = "https://algoviz-brown-kappa.vercel.app";

/** Maps an old embedded address (/algoviz/sorting?x=1) to the same page on the AlgoViz site. */
export function algoVizTarget(pathname: string, search: string): string {
  const rest = pathname.replace(/^\/algoviz/, "").replace(/\/+$/, "");
  return `${ALGOVIZ_URL}${rest || "/"}${search}`;
}

export default function AlgoVizRedirect() {
  const { pathname, search } = useLocation();
  const target = algoVizTarget(pathname, search);
  useEffect(() => { window.location.replace(target); }, [target]);
  return <main aria-busy="true" style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}><p>Opening AlgoViz… <a href={target}>Continue to AlgoViz</a></p></main>;
}
