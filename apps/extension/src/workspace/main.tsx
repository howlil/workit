import { createRoot } from "react-dom/client";
import { WorkspaceApp } from "./WorkspaceApp";
import "./workspace.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<WorkspaceApp />);
}
