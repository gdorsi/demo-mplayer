"use client";

import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function Modal({
  children,
  className,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[90vh] w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 text-white shadow-[0_40px_120px_rgba(15,23,42,0.7)]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
