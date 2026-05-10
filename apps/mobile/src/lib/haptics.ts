import { Vibration } from "react-native";

function pulse(pattern: number | number[]) {
  Vibration.vibrate(pattern);
}

export const haptics = {
  selection() {
    pulse(8);
  },
  light() {
    pulse(12);
  },
  success() {
    pulse([0, 12, 30, 12]);
  },
  error() {
    pulse([0, 24, 40, 24]);
  },
};
