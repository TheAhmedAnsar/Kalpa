import { useEffect, useState } from "react";

const getIsDark = () => {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.getAttribute("data-theme") === "dark" ||
    root.classList.contains("dark")
  );
};

const useTailwindDark = () => {
  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const target = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(getIsDark()));
    observer.observe(target, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

export default useTailwindDark;
