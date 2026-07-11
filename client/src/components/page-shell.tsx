import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};

interface PageShellProps {
  children: ReactNode;
  /** max width of content column */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl" | "6xl";
  className?: string;
}

const maxWidthClass: Record<NonNullable<PageShellProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

/**
 * Shared authenticated-page chrome — same atmosphere as the landing/home
 * (ambient glow + padded column). Apply on every app route so UI doesn't
 * look like two different products.
 */
export function PageShell({
  children,
  maxWidth = "4xl",
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "relative w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px] sm:h-96 sm:w-96"
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto w-full min-w-0 space-y-6 md:space-y-8",
          maxWidthClass[maxWidth],
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  titleTestId?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow = "KRYDO STELLAR",
  title,
  description,
  titleTestId,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      {...fadeUp}
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono tracking-widest text-primary bg-primary/5 py-1 px-2"
          >
            {eyebrow}
          </Badge>
        )}
        <h1
          className="font-serif text-2xl font-bold tracking-tight sm:text-3xl break-words"
          data-testid={titleTestId}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </motion.div>
  );
}

/** Glass card classes matching landing / dashboard. */
export const glassCardClass =
  "border-border/80 bg-card/45 backdrop-blur-sm glow-card-hover rounded-2xl overflow-hidden";
