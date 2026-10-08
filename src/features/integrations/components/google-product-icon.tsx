import React from "react";
import { cn } from "@/lib/cn";

export type GoogleProduct = "GBP" | "GSC" | "GA4" | "GOOGLE";

interface GoogleProductIconProps {
  product: GoogleProduct;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function GoogleProductIcon({
  product,
  className,
  size = "md",
}: GoogleProductIconProps) {
  const containerSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-11 h-11 rounded-xl",
    xl: "w-14 h-14 rounded-2xl",
  };

  const svgSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
    lg: "w-5 h-5",
    xl: "w-7 h-7",
  };

  if (product === "GOOGLE") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white shadow-2xs border border-slate-200/80 shrink-0",
          containerSizes[size],
          className
        )}
      >
        <svg viewBox="0 0 24 24" className={svgSizes[size]}>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      </div>
    );
  }

  if (product === "GSC") {
    // Google Search Console Icon
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-blue-50 border border-blue-200/60 shadow-2xs shrink-0 text-blue-600",
          containerSizes[size],
          className
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className={svgSizes[size]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
          <path d="M7 10l3 3 7-7" strokeWidth="2.5" />
        </svg>
      </div>
    );
  }

  if (product === "GA4") {
    // Google Analytics 4 Icon (Orange Bar Chart)
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-amber-50 border border-amber-200/60 shadow-2xs shrink-0 text-amber-500",
          containerSizes[size],
          className
        )}
      >
        <svg viewBox="0 0 24 24" className={svgSizes[size]} fill="currentColor">
          <rect x="3" y="14" width="4.5" height="7" rx="1.5" />
          <rect x="9.75" y="8" width="4.5" height="13" rx="1.5" />
          <rect x="16.5" y="3" width="4.5" height="18" rx="1.5" />
        </svg>
      </div>
    );
  }

  // GBP (Google Business Profile Storefront)
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-indigo-50 border border-indigo-200/60 shadow-2xs shrink-0 text-indigo-600",
        containerSizes[size],
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className={svgSizes[size]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
      </svg>
    </div>
  );
}
