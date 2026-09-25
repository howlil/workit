import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  outDir: ".output",
  manifest: {
    name: "Workit - Job Search & Application Memory",
    description: "Personal job search memory, context tracker, and smart autofill workflow system",
    version: "0.1.0",
    homepage_url: "https://github.com/howlil/workit",
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
