import React from "react";

export interface ThemeColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

export function DynamicThemeStyles({ colors }: { colors?: ThemeColors | null }) {
  const primary = colors?.primaryColor || "#0D9488";
  const secondary = colors?.secondaryColor || "#0F766E";
  const accent = colors?.accentColor || "#F59E0B";

  return (
    <style
      id="dynamic-clinic-theme"
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            --brand-primary: ${primary};
            --brand-secondary: ${secondary};
            --brand-accent: ${accent};
          }
          .bg-brand-primary { background-color: var(--brand-primary) !important; }
          .text-brand-primary { color: var(--brand-primary) !important; }
          .border-brand-primary { border-color: var(--brand-primary) !important; }
          .hover\\:bg-brand-secondary:hover { background-color: var(--brand-secondary) !important; }
          .bg-brand-accent { background-color: var(--brand-accent) !important; }
          .text-brand-accent { color: var(--brand-accent) !important; }
        `,
      }}
    />
  );
}
