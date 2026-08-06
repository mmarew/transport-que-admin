import type { ReactNode } from "react";
import type { DesignName } from "../../lib/authConfig";
import { authThemes } from "./themes";

export function AuthShell({
  design,
  branding,
  children,
}: {
  design: DesignName;
  branding: { title: string; subtitle: string };
  children: ReactNode;
}) {
  const theme = authThemes[design];
  return (
    <div className={theme.outer}>
      {design === "split" && (
        <div className={theme.splitPanel}>
          <h1 className="text-4xl font-bold text-white">{branding.title}</h1>
          <p className="mt-4 max-w-md text-white/80">{branding.subtitle}</p>
        </div>
      )}
      <div className={theme.content}>
        <div className={theme.card}>
          {design !== "split" && (
            <header>
              <h1 className={theme.heading}>{branding.title}</h1>
              <p className={theme.subtitle}>{branding.subtitle}</p>
            </header>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
