import { createRoot } from "react-dom/client";

function Workspace() {
  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#444444",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Workit</h1>
      <p style={{ color: "#777777", marginTop: 8, fontSize: 14 }}>
        Workspace will be built in S4.
      </p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Workspace />);
}
