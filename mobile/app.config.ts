import type { ConfigContext, ExpoConfig } from "expo/config";

import app from "./app.json";

export default function configureApp(_context: ConfigContext): ExpoConfig {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();
  return {
    ...app.expo,
    android: {
      ...app.expo.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  } as ExpoConfig;
}
