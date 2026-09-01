"use client";

import * as React from "react";
import { Search } from "lucide-react";

export type SearchBarProps = React.InputHTMLAttributes<HTMLInputElement>;

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={`group relative w-full ${className || ""}`}>
        <input
          ref={ref}
          type="search"
          className="block h-11 w-full rounded-lg border-1 border-[#E1E7EF] bg-white pl-4 pr-12 text-sm text-black outline-none placeholder:text-[#98A4C4] hover:border-primary focus:border-primary focus:ring-0"
          {...props}
        />

        <div
          className="
          pointer-events-none absolute right-0 top-0
          flex h-11 w-11 items-center justify-center
          rounded-r-lg
          bg-[#F7F8FA]
          transition-colors duration-150
          group-hover:bg-primary
          group-focus-within:bg-primary
        "
        >
          <Search
            className="
            h-5 w-5
            text-[#003B4D]
            transition-colors duration-150
            group-hover:text-white
            group-focus-within:text-white
          "
            strokeWidth={2.5}
          />
        </div>
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
