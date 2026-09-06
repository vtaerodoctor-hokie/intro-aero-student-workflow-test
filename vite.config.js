import { studentWorkspacePlugin } from "./scripts/student-workspace.mjs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { flightOfflinePlugin } from "./scripts/flight-offline-plugin.mjs";

import { missionPlugin } from "./scripts/mission-plugin.mjs";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), studentWorkspacePlugin(), missionPlugin(), flightOfflinePlugin()],
  test: {
    environment: "node",
  },
});
