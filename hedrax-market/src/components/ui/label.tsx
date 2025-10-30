import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

// Minimal className joiner (avoids bringing in tailwind-merge/clsx)
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Set to true if the associated input is required to show the red asterisk */
  requiredMark?: boolean;
}

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, children, requiredMark, ...props }, ref) => {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        // Base style (shadcn-like)
        "text-sm font-medium leading-none",
        // Nice defaults for your dark theme
        "text-white/80",
        // Respect peer-disabled (when labeling a disabled input)
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {requiredMark && <span className="ml-0.5 text-red-500">*</span>}
    </LabelPrimitive.Root>
  );
});

Label.displayName = "Label";

export default Label;
