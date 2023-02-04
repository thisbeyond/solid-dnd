import { defineConfig } from "tsup-preset-solid";

export default defineConfig(
  {
    entry: "src/index.tsx",
    devEntry: true,
  },
  {
    // Uncomment this to update package.json
    // writePackageJson: true,
    dropConsole: true,
  }
);
