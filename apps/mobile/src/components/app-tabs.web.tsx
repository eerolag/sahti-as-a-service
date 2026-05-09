import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from "expo-router/ui";
import React from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <View className="absolute bottom-4 left-4 right-4 flex-row rounded-lg border border-border bg-card p-2">
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Pelit</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/explore" asChild>
            <TabButton>Tili</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      className={[
        "min-h-11 flex-1 items-center justify-center rounded-md px-3",
        isFocused ? "bg-secondary" : "bg-transparent",
      ].join(" ")}
    >
      <Text variant="small" className={isFocused ? "text-secondary-foreground" : "text-muted-foreground"}>
        {children}
      </Text>
    </Pressable>
  );
}
