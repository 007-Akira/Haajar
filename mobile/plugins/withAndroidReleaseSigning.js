const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING_SETUP = `
def haajarSigningValues = [
    storeFile: System.getenv("HAJAR_UPLOAD_STORE_FILE") ?: findProperty("HAJAR_UPLOAD_STORE_FILE"),
    storePassword: System.getenv("HAJAR_UPLOAD_STORE_PASSWORD") ?: findProperty("HAJAR_UPLOAD_STORE_PASSWORD"),
    keyAlias: System.getenv("HAJAR_UPLOAD_KEY_ALIAS") ?: findProperty("HAJAR_UPLOAD_KEY_ALIAS"),
    keyPassword: System.getenv("HAJAR_UPLOAD_KEY_PASSWORD") ?: findProperty("HAJAR_UPLOAD_KEY_PASSWORD")
]
def haajarHasReleaseSigning = haajarSigningValues.values().every { it != null && !it.toString().trim().isEmpty() }
def haajarReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }

if (haajarReleaseRequested && !haajarHasReleaseSigning) {
    throw new GradleException("Haajar release signing is not configured. Set HAJAR_UPLOAD_STORE_FILE, HAJAR_UPLOAD_STORE_PASSWORD, HAJAR_UPLOAD_KEY_ALIAS, and HAJAR_UPLOAD_KEY_PASSWORD as protected environment variables or Gradle properties.")
}
`;

function configureSigning(buildGradle) {
  let contents = buildGradle.contents;
  if (!contents.includes("def haajarSigningValues")) {
    contents = contents.replace("android {", `${SIGNING_SETUP}\nandroid {`);
  }
  contents = contents.replace(
    /(signingConfigs \{\s*debug \{[\s\S]*?\n\s*\})\s*\n\s*\}/,
    `$1
        if (haajarHasReleaseSigning) {
            release {
                storeFile file(haajarSigningValues.storeFile)
                storePassword haajarSigningValues.storePassword
                keyAlias haajarSigningValues.keyAlias
                keyPassword haajarSigningValues.keyPassword
            }
        }
    }`,
  );
  contents = contents.replace(
    /release \{\s*(?:\/\/ Caution![\s\S]*?signed-apk-android\.\s*)?signingConfig signingConfigs\.debug/,
    `release {
            if (haajarHasReleaseSigning) {
                signingConfig signingConfigs.release
            }`,
  );
  buildGradle.contents = contents;
  return buildGradle;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (configWithGradle) => {
    if (configWithGradle.modResults.language !== "groovy") {
      throw new Error("Haajar release signing requires a Groovy app/build.gradle file.");
    }
    configWithGradle.modResults = configureSigning(configWithGradle.modResults);
    return configWithGradle;
  });
};

module.exports.configureSigning = configureSigning;
