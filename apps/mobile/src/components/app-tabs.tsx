import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const colors = Colors.dark;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      iconColor={{ default: colors.textSecondary, selected: "#facc15" }}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Pelit</Label>
        <Icon src={require("@/assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>Tili</Label>
        <Icon src={require("@/assets/images/tabIcons/explore.png")} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
