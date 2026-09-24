import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  outDir: ".output",
  manifest: {
    name: "Workit",
    description: "Job search memory and workflow system",
    permissions: ["storage"],
  },
});
