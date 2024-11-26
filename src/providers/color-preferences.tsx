"use client";

import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Colors = "blue" | "green" | "red" | "teal" | "orange"  ;

type ColorPreferencesContext = {
  color: Colors;
  selectColor: (color: Colors) => void;
};

const ColorPreferencesContext = createContext<
  ColorPreferencesContext | undefined
>(undefined);

export const useColorPreferences = () => {
  const context = useContext(ColorPreferencesContext);
  if (!context) {
    throw new Error(
      "useColorPreferences must be used within a ColorPreferencesProvider"
    );
  }

  return context;
};

export const ColorPreferencesProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [color, setColor] = useState<Colors>(() => {
    const storedColor =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("selectedColor")
        : null;
    return (storedColor as Colors) || "";
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    localStorage.setItem("selectedColor", color);
    setIsMounted(true);
  }, [color]);

  const selectColor = (selectedColor: Colors) => setColor(selectedColor);

  const value: ColorPreferencesContext = {
    color,
    selectColor,
  };

  if (!isMounted) return null;

  return (
    <ColorPreferencesContext.Provider value={value}>
      {children}
    </ColorPreferencesContext.Provider>
  );
};
