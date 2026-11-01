import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight, Lock } from "lucide-react";
import { useAppSettingsStore, type ThemeMode } from "@/store/appSettingsStore";
import "./projectHub.css";
import { countWord, hubProjects, pad2 } from "./projects";

export function HubSignInLink() {
  return <Link className="hub-account" to="/projects?returnTo=%2Fdashboard">เข้าสู่ระบบ</Link>;
}

const stackedQuery = "(max-width: 760px)";
const featured = hubProjects.find((project) => project.featured) ?? hubProjects[0];

export default function ProjectHubContent({ account }: { account: ReactNode }) {
  const [active, setActive] = useState(0);
  const total = hubProjects.length;
  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = "Nexus All — Projects";
    document.documentElement.lang = "th";
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, []);

  // When panels are stacked, the first tap expands a panel and the second opens it.
  function openOrExpand(index: number, event: MouseEvent<HTMLAnchorElement>) {
    if (index !== active && window.matchMedia(stackedQuery).matches) {
      event.preventDefault();
      setActive(index);
    }
  }

  return (
    <div id="top" className="project-hub">
      <a className="skip-link" href="#projects">ข้ามไปเลือกพื้นที่ทำงาน</a>
      <div className="hub-ambient" aria-hidden="true" />
      <div className="hub-inner">
        <header className="site-header">
          <a className="brand" href="/projects" aria-label="Nexus หน้าหลัก">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span className="brand-name" lang="en">nexus<span>.</span></span>
          </a>
          <nav aria-label="เมนูหลัก"><a href="#projects">พื้นที่ทำงาน</a><a href="#about">เกี่ยวกับ Nexus</a></nav>
          <div className="hub-theme-slot"><HubThemeControl /></div>
          <div className="hub-account-slot">{account}</div>
        </header>
        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-content">
              <p className="eyebrow" lang="en"><span aria-hidden="true" />Private workspace hub</p>
              <h1 id="hero-title" lang="en">{countWord(total)} workspaces.<br /><em>One quiet place.</em></h1>
              <p className="hero-lead">รวมพื้นที่ทำงานส่วนตัวและเครื่องมือของคุณไว้ในที่เดียว เรียบ นิ่ง และพร้อมใช้งานทุกเมื่อ</p>
              <div className="hero-actions">
                <a className="button primary" href="#projects">สำรวจ Workspaces<ArrowDown size={18} aria-hidden="true" /></a>
                <a className="button ghost" href={featured.href}>เปิด {featured.title}</a>
              </div>
            </div>
            <div className="hero-orbit" aria-hidden="true">
              <div className="orbit-ring" />
              <div className="orbit-mid" />
              <div className="orbit-core" />
              <div className="orbit-dot"><span /></div>
              <span className="orbit-letter">P</span>
            </div>
          </section>
          <section className="projects" id="projects" aria-labelledby="projects-title" tabIndex={-1}>
            <div className="projects-head">
              <div>
                <p className="eyebrow" lang="en"><span aria-hidden="true" />Collection · {pad2(total)}</p>
                <h2 id="projects-title" lang="en">Step into a <em>workspace.</em></h2>
              </div>
              <div className="projects-counter">
                <div className="counter" aria-hidden="true">{pad2(active + 1)}<span> / {pad2(total)}</span></div>
                <p>เลื่อนเมาส์ผ่านแผงเพื่อดูรายละเอียด คลิกเพื่อเข้าใช้งาน</p>
              </div>
            </div>
            <div className="accordion">
              {hubProjects.map((project, index) => (
                <a
                  key={project.id}
                  className={`panel g${index % 5}${index === active ? " on" : ""}`}
                  href={project.href}
                  aria-label={project.label}
                  onPointerEnter={(event) => { if (event.pointerType === "mouse") setActive(index); }}
                  onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setActive(index); }}
                  onClick={(event) => openOrExpand(index, event)}
                >
                  <span className="bg" aria-hidden="true" />
                  <span className="scrim" aria-hidden="true" />
                  <span className="numtop" aria-hidden="true">{pad2(index + 1)}</span>
                  <span className="col" aria-hidden="true">{project.title}</span>
                  <span className="exp">
                    <span className="pills">
                      <span className="pill">{pad2(index + 1)}</span>
                      <span className="pill">{project.category}</span>
                      {project.requiresLogin && <span className="pill"><Lock size={12} aria-hidden="true" />ต้องเข้าสู่ระบบ</span>}
                    </span>
                    <span className="exp-body">
                      <h3 className="exp-title" lang="en">{project.title}</h3>
                      <span className="exp-desc">{project.description}</span>
                      <span className="exp-foot">
                        <span className="pills">{project.tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}</span>
                        <span className="go" aria-hidden="true"><ArrowUpRight size={20} /></span>
                      </span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
            <p className="project-note">มีเพียง Nexus Main ที่ต้องเข้าสู่ระบบ เครื่องมืออื่นทั้งหมดใช้งานได้ทันทีโดยไม่ต้องมีบัญชี</p>
          </section>
        </main>
        <footer id="about">
          <a className="brand" href="#top" aria-label="Nexus กลับด้านบน"><span className="brand-name" lang="en">nexus<span>.</span></span></a>
          <p>พื้นที่ทำงานที่เป็นระเบียบ เริ่มต้นที่ Nexus</p>
        </footer>
      </div>
    </div>
  );
}

function HubThemeControl() {
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const setThemeMode = useAppSettingsStore((state) => state.setThemeMode);
  return (
    <label className="hub-theme-control">
      <span>ธีม</span>
      <select aria-label="เลือกธีมสี" value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
        <option value="system">ตามระบบ</option>
        <option value="light">สว่าง</option>
        <option value="dark">มืด</option>
        <option value="mono">โมโน</option>
      </select>
    </label>
  );
}
