interface ShareUrlInput {
  title?: string;
  text?: string;
  url: string;
}

export function isWebShareSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareUrl(input: ShareUrlInput): Promise<void> {
  if (!isWebShareSupported()) {
    throw new Error("Jakaminen ei ole käytettävissä tällä laitteella.");
  }

  await navigator.share({
    title: input.title,
    text: input.text,
    url: input.url,
  });
}
