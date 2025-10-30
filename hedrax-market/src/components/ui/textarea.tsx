import * as React from "react";

// Minimal className joiner (keeps deps light)
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          // Layout
          "flex w-full min-h-[100px] rounded-xl p-3",
          // Typography / theme
          "text-sm text-[#d5d7e3] placeholder:text-white/40",
          // Dark card look
          "bg-white/[0.04] border border-white/10",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-white/30",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transition
          "transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
