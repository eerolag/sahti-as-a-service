import * as SecureStore from "expo-secure-store";

const HOST_TOKEN_PREFIX = "breview.host-token.v1";

function key(shareId: string): string {
  return `${HOST_TOKEN_PREFIX}:${shareId}`;
}

export async function saveHostToken(shareId: string, token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(shareId), token);
  } catch {
    // Host links still work in the current flow even if secure storage is unavailable.
  }
}

export async function loadHostToken(shareId: string): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(key(shareId))) ?? "";
  } catch {
    return "";
  }
}

