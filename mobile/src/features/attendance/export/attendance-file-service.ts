import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export async function shareAttendanceCsv(filename: string, csv: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is unavailable.");
  const uri = await writeTemporaryCsv(filename, csv);
  await Sharing.shareAsync(uri, {
    dialogTitle: "Share attendance CSV",
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
  });
}

export async function saveAttendanceCsv(filename: string, csv: string): Promise<void> {
  if (Platform.OS !== "android") {
    await shareAttendanceCsv(filename, csv);
    return;
  }
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) throw new Error("Storage permission was not granted.");
  const nameWithoutExtension = filename.replace(/\.csv$/i, "");
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    nameWithoutExtension,
    "text/csv"
  );
  await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function writeTemporaryCsv(filename: string, csv: string): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error("Temporary storage is unavailable.");
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}
