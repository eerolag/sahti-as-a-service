import "../global.css";

import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import React from "react";

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
  return (
    <ThemeProvider value={breviewTheme}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="[gameId]"
          options={{
            title: "Peli",
            headerStyle: { backgroundColor: "#101318" },
            headerTintColor: "#f4f4f5",
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
