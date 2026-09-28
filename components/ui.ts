// Shared control styles: square corners, 1px lines, mono labels, 44px touch targets, visible focus.
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-accent-text focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const BUTTON = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-border bg-card px-3 font-mono text-[13px] text-foreground transition-colors duration-150 hover:border-muted-foreground/60 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const BUTTON_PRIMARY = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-accent px-4 font-mono text-[13px] font-medium text-accent-foreground transition-colors duration-150 hover:bg-[#ef3434] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${FOCUS}`;

export const ICON_BUTTON = `inline-flex size-10 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const INPUT = `w-full border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:font-mono placeholder:text-sm placeholder:text-muted-foreground transition-colors duration-150 focus:border-accent focus:outline-none disabled:opacity-50`;

export const CARD = "border border-border bg-card";

/** Mono section label, e.g. "// SOURCES". */
export const LABEL = "font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground";
