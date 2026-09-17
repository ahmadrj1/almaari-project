"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
  searchText?: string;
  className?: string;
}

export interface SortDropdownProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  options: readonly Option[];
  value: string;
  placeholder?: React.ReactNode;
  onValueChange: (value: string) => void;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  footerOption?: Option;
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join(" ");
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}

export const SortDropdown = React.forwardRef<
  HTMLButtonElement,
  SortDropdownProps
>(
  (
    {
      className,
      buttonClassName,
      menuClassName,
      optionClassName,
      options,
      value,
      placeholder = "Select an option",
      onValueChange,
      disabled,
      searchable = false,
      searchPlaceholder = "Search...",
      emptyMessage = "No options found",
      footerOption,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [openAbove, setOpenAbove] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState<number>(-1);
    const [searchQuery, setSearchQuery] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});

    const selectedOption =
      footerOption && footerOption.value === value
        ? footerOption
        : (options.find((option) => option.value === value) ?? null);

    React.useImperativeHandle(
      ref,
      () => buttonRef.current as HTMLButtonElement,
    );

    const filteredOptions = React.useMemo(() => {
      if (!searchable || !searchQuery.trim()) {
        return options;
      }
      const q = searchQuery.toLowerCase().trim();
      return options.filter((option) => {
        if (option.searchText) {
          return option.searchText.toLowerCase().includes(q);
        }
        if (typeof option.label === "string") {
          return option.label.toLowerCase().includes(q);
        }
        if (typeof option.value === "string") {
          return option.value.toLowerCase().includes(q);
        }
        const text = extractText(option.label);
        return text.toLowerCase().includes(q);
      });
    }, [options, searchable, searchQuery]);

    const updateMenuPosition = React.useCallback(() => {
      const trigger = buttonRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const estimatedMenuHeight = 288;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove =
        spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

      setOpenAbove(shouldOpenAbove);
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: shouldOpenAbove ? undefined : rect.bottom + 8,
        bottom: shouldOpenAbove ? window.innerHeight - rect.top + 8 : undefined,
        maxHeight: shouldOpenAbove
          ? Math.max(160, Math.min(spaceAbove - 16, 360))
          : Math.max(160, Math.min(spaceBelow - 16, 360)),
      });
    }, []);

    const closeMenu = React.useCallback(() => {
      setIsOpen(false);
      setSearchQuery("");
    }, []);

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node) &&
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          closeMenu();
        }
      }

      function handleEscape(event: KeyboardEvent) {
        if (event.key === "Escape") {
          closeMenu();
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [closeMenu]);

    React.useEffect(() => {
      if (!isOpen) {
        setSearchQuery("");
        return;
      }

      updateMenuPosition();
      const allOptions = footerOption ? [...options, footerOption] : options;
      const currentIndex = allOptions.findIndex(
        (option) => option.value === value,
      );
      const firstEnabledIndex = allOptions.findIndex(
        (option) => !option.disabled,
      );
      setActiveIndex(currentIndex >= 0 ? currentIndex : firstEnabledIndex);

      let focusTimer: NodeJS.Timeout | undefined;
      if (searchable) {
        focusTimer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }

      const handleReposition = () => updateMenuPosition();
      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);

      return () => {
        if (focusTimer) clearTimeout(focusTimer);
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, [isOpen, options, footerOption, searchable, updateMenuPosition, value]);

    const openMenu = () => {
      if (disabled) {
        return;
      }

      updateMenuPosition();
      setIsOpen((prev) => !prev);
    };

    const chooseOption = (option: Option) => {
      if (option.disabled) {
        return;
      }

      onValueChange(option.value);
      closeMenu();
    };

    const moveActive = (direction: 1 | -1) => {
      const allNav = footerOption
        ? [...filteredOptions, footerOption]
        : filteredOptions;
      if (!allNav.length) {
        return;
      }

      let nextIndex = activeIndex;
      for (let i = 0; i < allNav.length; i += 1) {
        nextIndex = (nextIndex + direction + allNav.length) % allNav.length;
        if (!allNav[nextIndex]?.disabled) {
          setActiveIndex(nextIndex);
          break;
        }
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      if (
        !isOpen &&
        ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)
      ) {
        event.preventDefault();
        openMenu();
        return;
      }

      if (!isOpen) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const allNav = footerOption
          ? [...filteredOptions, footerOption]
          : filteredOptions;
        const option = allNav[activeIndex];
        if (option) {
          chooseOption(option);
        }
      }
    };

    const handleSearchKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
        return;
      }

      const allNav = footerOption
        ? [...filteredOptions, footerOption]
        : filteredOptions;

      if (!allNav.length) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const option = allNav[activeIndex >= 0 ? activeIndex : 0];
        if (option) {
          chooseOption(option);
        }
      }
    };

    return (
      <div
        ref={wrapperRef}
        className={cn("relative inline-block text-left", className)}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-disabled={disabled}
          onClick={openMenu}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-[#E1E7EF] bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            buttonClassName,
          )}
          {...props}
        >
          <span
            className={cn(
              "min-w-0 truncate",
              selectedOption ? "text-slate-900" : "text-[#98A4C4]",
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-150",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={menuStyle}
              className={cn(
                "z-50 flex flex-col overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-black/5 animate-slide-in max-h-72",
                openAbove ? "origin-bottom-left" : "origin-top-left",
                menuClassName,
              )}
            >
              {searchable && (
                <div className="shrink-0 border-b border-[#E1E7EF] bg-white p-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      placeholder={searchPlaceholder}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full rounded-md border border-[#E1E7EF] bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto min-h-0">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => chooseOption(option)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-[#EAF2FF] text-primary"
                            : isActive
                              ? "bg-[#F7FAFF] text-slate-900"
                              : "text-slate-700 hover:bg-[#F7FAFF] hover:text-slate-900",
                          option.disabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          option.className,
                          optionClassName,
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {footerOption && (
                <div className="shrink-0 border-t border-[#E1E7EF] bg-white p-1">
                  <button
                    type="button"
                    role="option"
                    aria-selected={footerOption.value === value}
                    disabled={footerOption.disabled}
                    onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                    onClick={() => chooseOption(footerOption)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors rounded-lg",
                      footerOption.value === value
                        ? "bg-[#EAF2FF] text-primary"
                        : activeIndex === filteredOptions.length
                          ? "bg-[#F7FAFF] text-slate-900"
                          : "text-blue-600 hover:bg-blue-50 font-medium",
                      footerOption.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer",
                      footerOption.className,
                      optionClassName,
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {footerOption.label}
                    </span>
                    {footerOption.value === value && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

SortDropdown.displayName = "SortDropdown";

export const DropdownSelect = SortDropdown;
