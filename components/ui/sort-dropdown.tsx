"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface SortDropdownProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  options: readonly Option[];
  value: string;
  placeholder?: React.ReactNode;
  onValueChange: (value: string) => void;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

export const SortDropdown = React.forwardRef<HTMLButtonElement, SortDropdownProps>(
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
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [openAbove, setOpenAbove] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState<number>(-1);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});

    const selectedOption =
      options.find((option) => option.value === value) ?? null;

    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    const updateMenuPosition = React.useCallback(() => {
      const trigger = buttonRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const estimatedMenuHeight = 256;
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
      });
    }, []);

    const closeMenu = React.useCallback(() => {
      setIsOpen(false);
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
        return;
      }

      updateMenuPosition();
      const currentIndex = options.findIndex((option) => option.value === value);
      const firstEnabledIndex = options.findIndex((option) => !option.disabled);
      setActiveIndex(currentIndex >= 0 ? currentIndex : firstEnabledIndex);
      const handleReposition = () => updateMenuPosition();
      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);

      return () => {
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, [isOpen, options, updateMenuPosition, value]);

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
      if (!options.length) {
        return;
      }

      let nextIndex = activeIndex;
      for (let i = 0; i < options.length; i += 1) {
        nextIndex = (nextIndex + direction + options.length) % options.length;
        if (!options[nextIndex]?.disabled) {
          setActiveIndex(nextIndex);
          break;
        }
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      if (!isOpen && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
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
        const option = options[activeIndex];
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
          <span className={cn("min-w-0 truncate", selectedOption ? "text-slate-900" : "text-[#98A4C4]")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-150", isOpen && "rotate-180")} />
        </button>

        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={menuStyle}
              className={cn(
                "z-50 max-h-64 overflow-auto rounded-xl border border-[#E1E7EF] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-black/5 animate-slide-in",
                openAbove ? "origin-bottom-left" : "origin-top-left",
                menuClassName,
              )}
            >
              {options.map((option, index) => {
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
                      option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      optionClassName,
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

SortDropdown.displayName = "SortDropdown";

export const DropdownSelect = SortDropdown;
