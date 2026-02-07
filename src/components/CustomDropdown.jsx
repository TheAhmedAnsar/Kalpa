import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const CustomDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select Option",
  label,
  getOptionLabel = (option) => option?.label || option,
  getOptionValue = (option) => option?.value || option,
  renderOption,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });

      // Focus search input when dropdown opens
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, searchable]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery("");
  };

  const selectedLabel = value ? getOptionLabel(value) : placeholder;

  // Filter options based on search query
  const filteredOptions =
    searchable && searchQuery
      ? options.filter((option) => {
          const label = getOptionLabel(option);
          return label.toLowerCase().includes(searchQuery.toLowerCase());
        })
      : options;

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
      }}
      className={`dark:bg-primary-dark z-[9999] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 ${dropdownClassName}`}
    >
      {searchable && (
        <div className="border-b border-gray-200 p-2 dark:border-gray-700">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div className="max-h-60 overflow-y-auto">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const optionValue = getOptionValue(option);
            const isSelected = value && getOptionValue(value) === optionValue;

            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => handleSelect(option)}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              >
                {renderOption ? (
                  renderOption(option, isSelected)
                ) : (
                  <>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getOptionLabel(option)}
                    </span>
                    {isSelected && (
                      <span className="text-indigo-600 dark:text-indigo-400">
                        ✓
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No options found
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`dark:bg-primary-dark dark:hover:bg-secondary-dark flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-100 ${buttonClassName}`}
      >
        <span className={!value ? "text-gray-500 dark:text-gray-400" : ""}>
          {selectedLabel}
        </span>
        <KeyboardArrowDownIcon fontSize="small" className="text-gray-500" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default CustomDropdown;
