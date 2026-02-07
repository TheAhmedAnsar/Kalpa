import constants from "../constants";

const accessLevelEntries = Object.entries(constants.access_level ?? {});

const normalizeAccessLevel = (rawValue) => {
  const seen = new Set();

  const visit = (value) => {
    if (value == null) {
      return null;
    }

    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const numericValue = Number(trimmed);
      if (!Number.isNaN(numericValue)) {
        return numericValue;
      }

      const normalizedLabel = trimmed.toLowerCase();
      const match = accessLevelEntries.find(([, label]) =>
        label?.toLowerCase() === normalizedLabel,
      );
      if (match) {
        const parsed = Number(match[0]);
        return Number.isNaN(parsed) ? null : parsed;
      }

      return null;
    }

    if (typeof value === "object") {
      if (seen.has(value)) {
        return null;
      }
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const normalized = visit(item);
          if (normalized != null) {
            return normalized;
          }
        }
        return null;
      }

      const possibleKeys = [
        "access_level",
        "accessLevel",
        "level",
        "value",
        "id",
      ];

      for (const key of possibleKeys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const normalized = visit(value[key]);
          if (normalized != null) {
            return normalized;
          }
        }
      }

      if (typeof value.valueOf === "function") {
        const primitive = value.valueOf();
        if (primitive !== value) {
          const normalized = visit(primitive);
          if (normalized != null) {
            return normalized;
          }
        }
      }

      return null;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  };

  const normalizedValue = visit(rawValue);
  return typeof normalizedValue === "number" && !Number.isNaN(normalizedValue)
    ? normalizedValue
    : null;
};

const ADMIN_ACCESS_LEVEL = (() => {
  const entry = accessLevelEntries.find(([, label]) => label === "Admin");
  return entry ? Number(entry[0]) : NaN;
})();

const isAdminAccessLevel = (accessLevel) => {
  const normalizedAccessLevel = normalizeAccessLevel(accessLevel);
  return (
    !Number.isNaN(ADMIN_ACCESS_LEVEL) &&
    normalizedAccessLevel === ADMIN_ACCESS_LEVEL
  );
};

export { ADMIN_ACCESS_LEVEL, isAdminAccessLevel, normalizeAccessLevel };
