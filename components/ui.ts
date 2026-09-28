// Shared class names so every control looks and behaves the same (44px touch targets, visible focus).
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const BUTTON = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const BUTTON_PRIMARY = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 ${FOCUS}`;

export const ICON_BUTTON = `inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const INPUT = `w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50`;

export const CARD = "rounded-xl border border-border bg-card";
