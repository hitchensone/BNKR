import { Dock } from "./dock";

export function Shell({
  modules,
  initials,
  children,
}: {
  modules: Parameters<typeof Dock>[0]["modules"];
  initials: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 p-4 pb-28 sm:p-6 md:pb-6 print:block print:p-0">
      <div className="no-print contents">
        <Dock modules={modules} initials={initials} />
      </div>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
