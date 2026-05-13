import { Stack } from "expo-router";
import { useT } from "@/lib/i18nContext";

export default function TabsLayout() {
  const t = useT();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#101318" },
        headerTintColor: "#f4f4f5",
        headerShadowVisible: false,
        headerBackTitle: "",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ title: t.nav.account }} />
    </Stack>
  );
}
