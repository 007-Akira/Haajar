import { Linking } from "react-native";

export async function openPhoneLink(phone: string | null | undefined): Promise<boolean> {
  const normalizedPhone = phone?.trim();
  if (!normalizedPhone) return false;

  await Linking.openURL(`tel:${encodeURIComponent(normalizedPhone)}`);
  return true;
}
