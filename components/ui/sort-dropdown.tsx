"use client";

import * as React from "react";

export interface Option {
  label: string;
  value: string;
}

export interface SortDropdownProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly Option[];
}

export const SortDropdown = React.forwardRef<
  HTMLSelectElement,
  SortDropdownProps
>(({ className, options, ...props }, ref) => {
  return (
    <div className={`relative ${className || ""}`}>
      <select
        ref={ref}
        className="block h-11 w-full appearance-none rounded-lg border-1 border-[#E1E7EF] bg-white px-3 pr-10 text-sm text-[#98A4C4] outline-none hover:border-primary focus:ring-0"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <div className="h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#4B5158]" />
      </div>
    </div>
  );
});

SortDropdown.displayName = "SortDropdown";