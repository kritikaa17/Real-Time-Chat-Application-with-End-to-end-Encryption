"use client";

import { useTheme } from "next-themes";
import { FC, ReactNode } from "react";

import { useColorPreferences } from "@/providers/color-preferences";
import { cn } from "@/lib/utils";

const MainContent: FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const { color } = useColorPreferences();

  let backgroundColor = "bg-primary-dark";
  if (color === "green") {
    backgroundColor = "bg-green-700";
  } else if (color === "blue") {
    backgroundColor = "bg-blue-700";
  } else if (color === "red") {
    backgroundColor = "bg-red-700";
  } else if (color === "teal") {
    backgroundColor = "bg-teal-700";
  } else if (color === "orange") {
    backgroundColor = "bg-orange-700";
  }
 
  return (
    <div
      className={cn("md:px-2 md:pb-2 md:pt-14 md:h-screen", backgroundColor)}
    >
      <main
        className={cn(
          "md:ml-[280px] lg:ml-[420px] md:h-full overflow-y-hidden ",
          theme === "dark" ? "bg-[#232529]" : "bg-white"
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default MainContent;
