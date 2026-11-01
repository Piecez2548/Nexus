export interface HubProject {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  href: string;
  /** Accessible name of the whole panel link. */
  label: string;
  /** Only Nexus Main needs a session; every other project works without an account. */
  requiresLogin?: boolean;
  /** The project the hero's secondary button opens. */
  featured?: boolean;
}

// Single source for the hub: add an entry and a panel (and the counter) appears.
export const hubProjects: HubProject[] = [
  { id: "main", title: "Nexus Main", category: "Workspace", description: "การเงิน การลงทุน และงานส่วนตัว", tags: ["Finance", "Investing", "Personal"], href: "/dashboard", label: "เข้าสู่ Nexus Main", requiresLogin: true, featured: true },
  { id: "tools", title: "Nexus Tools", category: "Tools", description: "จัดการ PDF รูปภาพ และเอกสาร", tags: ["PDF", "Images", "Documents"], href: "https://nexus-tools-chi.vercel.app/", label: "เข้าสู่ Nexus Tools" },
  { id: "datalens", title: "DataLens", category: "Tools", description: "วิเคราะห์ CSV ตรวจคุณภาพข้อมูล และสำรวจกราฟ", tags: ["CSV", "Data quality", "Charts"], href: "https://datalens-kappa-one.vercel.app/", label: "เข้าสู่ DataLens" },
  { id: "algoviz", title: "AlgoViz", category: "Learning", description: "เรียนรู้ algorithm ผ่าน visualization แบบทีละขั้น", tags: ["Algorithms", "Visualization"], href: "https://algoviz-brown-kappa.vercel.app/", label: "เข้าสู่ AlgoViz" },
  { id: "screentutor", title: "ScreenTutor", category: "Learning", description: "อ่านหน้าจอ อธิบายเนื้อหา และเรียนรู้ด้วย AI บนเครื่อง", tags: ["OCR", "Local AI"], href: "/screentutor", label: "เปิด ScreenTutor" },
];

const numberWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Five" for five projects; falls back to the digits past ten. */
export function countWord(count: number) {
  return numberWords[count] ?? String(count);
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}
