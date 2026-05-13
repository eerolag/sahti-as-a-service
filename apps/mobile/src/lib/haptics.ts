import * as Haptics from "expo-haptics";

function runHaptic(effect: () => Promise<void>) {
  if (process.env.EXPO_OS !== "ios" && process.env.EXPO_OS !== "android") return;
  void effect().catch(() => {});
}

export const haptics = {
  selection() {
    runHaptic(() => Haptics.selectionAsync());
  },
  light() {
    runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  success() {
    runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  error() {
    runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
