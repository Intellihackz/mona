import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Cyber Button — a brutalist slab button with a glowing scanline edge
 * frame, a dotted texture and a hover halo.
 *
 * No Radix dependency: `asChild` is implemented with React.cloneElement,
 * so the slotted child (e.g. an <a>) receives the button classes, styles
 * and ref directly.
 *
 * Everything is driven by shadcn theme tokens (light/dark compatible):
 * the glow color per variant is injected as a --cyber-glow CSS variable,
 * so the frame, halo and shadows recolor themselves automatically.
 */

const variantGlow: Record<string, string> = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  destructive: "var(--destructive)",
  outline: "color-mix(in oklab, var(--foreground) 70%, transparent)",
};

const cyberButtonVariants = cva(
  // Base slab — transparent so the button sits cleanly on any surface
  "relative inline-flex select-none items-center justify-center whitespace-nowrap bg-transparent font-mono font-bold uppercase tracking-[0.2em] text-foreground outline-none transition-[box-shadow,transform] duration-300 hover:shadow-[0_0_30px_-6px_var(--cyber-glow)] active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        secondary:
          "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        destructive:
          "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--destructive)_30%,transparent)] text-destructive",
        outline: "shadow-[inset_0_0_0_1px_var(--border)]",
      },
      size: {
        sm: "h-9 px-4 text-[10px]",
        default: "h-11 px-7 text-xs",
        lg: "h-14 px-10 text-sm",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

/* Decorative layers (all aria-hidden, pointer-events-none) */
const EDGE =
  "pointer-events-none absolute opacity-50 transition-opacity duration-300 group-hover:opacity-100";
const HALO =
  "pointer-events-none absolute -inset-16 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background-image:radial-gradient(color-mix(in_oklab,var(--cyber-glow)_30%,transparent)_1px,transparent_1px)] [background-size:3px_3px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_50%)]";
const TEXTURE =
  "pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_80%,transparent)_1px,transparent_1px)] [background-size:4px_4px] [mask-image:radial-gradient(ellipse_at_center,transparent_35%,black_100%)]";

/** Call every ref in the list with the same node. */
function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cyberButtonVariants> {
  /** Merge the button styles onto the child element instead of rendering a <button>. */
  asChild?: boolean;
}

const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  (
    { className, variant, size, asChild = false, style, children, ...props },
    ref,
  ) => {
    const glow = {
      "--cyber-glow": variantGlow[variant ?? "primary"],
    } as React.CSSProperties;

    /* Decorative frame shared by both render paths */
    const frame = (
      <>
        {/* Hover halo — dotted field that fades in around the button */}
        <span aria-hidden data-slot="cyber-button-halo" className={HALO} />

        {/* Scanline edge frame — 4 glowing gradient bars overhanging the slab */}
        <span
          aria-hidden
          className={cn(
            EDGE,
            "left-0 top-[-22px] bottom-[-22px] w-px bg-gradient-to-b from-transparent via-[var(--cyber-glow)] to-transparent shadow-[0_0_14px_0_var(--cyber-glow)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            EDGE,
            "right-0 top-[-22px] bottom-[-22px] w-px bg-gradient-to-b from-transparent via-[var(--cyber-glow)] to-transparent shadow-[0_0_14px_0_var(--cyber-glow)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            EDGE,
            "top-0 left-[-22px] right-[-22px] h-px bg-gradient-to-r from-transparent via-[var(--cyber-glow)] to-transparent shadow-[0_0_14px_0_var(--cyber-glow)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            EDGE,
            "bottom-0 left-[-22px] right-[-22px] h-px bg-gradient-to-r from-transparent via-[var(--cyber-glow)] to-transparent shadow-[0_0_14px_0_var(--cyber-glow)]",
          )}
        />

        {/* Dotted texture concentrated at the slab edges */}
        <span aria-hidden data-slot="cyber-button-texture" className={TEXTURE} />
      </>
    );

    const classes = cn(cyberButtonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string;
        style?: React.CSSProperties;
        children?: React.ReactNode;
        ref?: React.Ref<unknown>;
      }>;
      return (
        <span className="group relative inline-flex align-middle" style={glow}>
          {frame}
          {React.cloneElement(
            child,
            {
              ref: mergeRefs<unknown>(
                ref as React.Ref<unknown>,
                child.props.ref,
              ),
              className: cn(classes, child.props.className),
              style: { ...glow, ...style, ...child.props.style },
              "data-slot": "cyber-button",
              ...props,
            } as Partial<typeof child.props>,
            <span className="relative z-10 inline-flex items-center gap-2">
              {child.props.children}
            </span>,
          )}
        </span>
      );
    }

    return (
      <span className="group relative inline-flex align-middle" style={glow}>
        {frame}
        <button
          ref={ref}
          type="button"
          data-slot="cyber-button"
          className={classes}
          style={{ ...glow, ...style }}
          {...props}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {children}
          </span>
        </button>
      </span>
    );
  },
);
CyberButton.displayName = "CyberButton";

export { CyberButton, cyberButtonVariants };
