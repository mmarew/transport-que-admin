import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const DARK_MODE_KEY = "app_dark_mode";

const readDarkMode = (): boolean => {
  try {
    return localStorage.getItem(DARK_MODE_KEY) === "true";
  } catch {
    return false;
  }
};

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [darkMode, setDarkMode] = useState(readDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const updateDarkMode = useCallback((value: boolean) => {
    setDarkMode(value);
    try {
      localStorage.setItem(DARK_MODE_KEY, String(value));
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = useMemo(
    () => ({ darkMode, setDarkMode: updateDarkMode }),
    [darkMode, updateDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
