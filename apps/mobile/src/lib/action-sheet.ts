import { ActionSheetIOS, Alert } from "react-native";

interface NativeAction {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

export function showNativeActionSheet(title: string, actions: NativeAction[], cancelLabel: string) {
  if (process.env.EXPO_OS === "ios") {
    const labels = actions.map((action) => action.label);
    const cancelButtonIndex = labels.length;
    const destructiveButtonIndex = actions.findIndex((action) => action.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...labels, cancelLabel],
        cancelButtonIndex,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
        userInterfaceStyle: "dark",
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) return;
        actions[buttonIndex]?.onPress();
      },
    );
    return;
  }

  Alert.alert(
    title,
    undefined,
    [
      ...actions.map((action) => ({
        text: action.label,
        style: action.destructive ? ("destructive" as const) : ("default" as const),
        onPress: action.onPress,
      })),
      { text: cancelLabel, style: "cancel" as const },
    ],
  );
}
