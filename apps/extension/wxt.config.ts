import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  outDir: ".output",
  manifest: {
    name: "Workit",
    description: "Job search memory and workflow system",
    permissions: ["storage"],
    host_permissions: ["http://localhost:*/*", "http://127.0.0.1:*/*"],
    icons: {
      16: "logo.png",
      32: "logo.png",
      48: "logo.png",
      128: "logo.png",
    },
    action: {
      default_title: "Workit",
    },
    web_accessible_resources: [
      {
        resources: ["workspace.html", "logo.png", "logo.webp", "assets/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
