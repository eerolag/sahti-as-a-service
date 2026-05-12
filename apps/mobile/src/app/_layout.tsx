import "../global.css";

import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import React from "react";
import { I18nProvider } from "@/lib/i18nContext";

const breviewTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#facc15",
    background: "#101318",
    card: "#101318",
    text: "#f4f4f5",
    border: "#333945",
    notification: "#f59e0b",
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree: require("../../assets/fonts/Figtree-wght.ttf"),
    JetBrainsMono: require("../../assets/fonts/JetBrainsMono-wght.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={breviewTheme}>
      <StatusBar style="light" />
      <I18nProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="[gameId]"
            options={{
              title: "Sessio",
              headerBackTitle: "",
              headerBackButtonDisplayMode: "minimal",
              headerStyle: { backgroundColor: "#101318" },
              headerTintColor: "#f4f4f5",
              headerShadowVisible: false,
            }}
          />
        </Stack>
      </I18nProvider>
    </ThemeProvider>
  );
}
