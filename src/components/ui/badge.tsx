import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  default: "bg-stone-100 text-slate-800",
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-900",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof styles;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        styles[tone],
        className,
      )}
      {...props}
    />
  );
}
