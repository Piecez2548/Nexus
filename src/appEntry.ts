export function shouldOpenScreenTutor(pathname: string, native: boolean): boolean {
  return !native && (pathname === "/" || pathname === "/index.html");
}
