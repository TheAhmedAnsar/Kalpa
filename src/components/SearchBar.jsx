import React from "react";
import SearchIcon from "@mui/icons-material/Search";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const HEIGHT_CLASSES = {
  sm: "h-10 text-[13px]",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

const SearchBar = React.forwardRef(
  (
    {
      value,
      onChange,
      placeholder = "Search...",
      icon,
      size = "md",
      className,
      inputClassName,
      rightSection,
      disabled = false,
      type = "search",
      ...rest
    },
    ref,
  ) => {
    const heightClass = HEIGHT_CLASSES[size] || HEIGHT_CLASSES.md;
    const iconNode =
      icon === null
        ? null
        : (icon ?? (
            <SearchIcon fontSize={size === "lg" ? "medium" : "small"} />
          ));

    return (
      <div
        className={cx(
          "group/search relative flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-gray-800 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-100",
          heightClass,
          disabled && "opacity-70",
          className,
        )}
      >
        {iconNode && (
          <span className="flex items-center text-gray-400 transition-colors dark:text-gray-300">
            {iconNode}
          </span>
        )}
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          type={type}
          className={cx(
            "h-full w-full flex-1 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500",
            inputClassName,
          )}
          {...rest}
        />
        {rightSection ? (
          <div className="flex items-center gap-1 pl-1 text-sm text-gray-500 dark:text-gray-400">
            {rightSection}
          </div>
        ) : null}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";

export default SearchBar;
