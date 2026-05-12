import * as ImagePicker from "expo-image-picker";

export type ImageSource = "camera" | "library";

const singleImagePickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  allowsEditing: false,
  allowsMultipleSelection: false,
  quality: 0.9,
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export async function requestImageSourcePermission(source: ImageSource): Promise<boolean> {
  if (source === "library") return true;

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

export function pickSingleImage(source: ImageSource): Promise<ImagePicker.ImagePickerResult> {
  return source === "camera"
    ? ImagePicker.launchCameraAsync(singleImagePickerOptions)
    : ImagePicker.launchImageLibraryAsync(singleImagePickerOptions);
}
