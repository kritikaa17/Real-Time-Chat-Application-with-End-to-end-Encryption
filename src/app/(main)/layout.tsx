import { FC, ReactNode } from "react";
import { ColorPreferencesProvider } from "@/providers/color-preferences";
import { ThemeProvider } from "@/providers/theme-provider";
import MainContent from "@/components/main-content";
import { WebSocketProvider } from "@/providers/web-socket";
import { QueryProvider } from "@/providers/query-provider";

const MainLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <WebSocketProvider>
        <ColorPreferencesProvider>
          <MainContent>
            <QueryProvider>{children}</QueryProvider>
          </MainContent>
        </ColorPreferencesProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
};

export default MainLayout;
