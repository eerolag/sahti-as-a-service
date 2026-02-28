import QRCode from "qrcode";

export async function generateQrSvg(target: string): Promise<string> {
  return QRCode.toString(target, {
    type: "svg",
    width: 320,
    margin: 1,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}
