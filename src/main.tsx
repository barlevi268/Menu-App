import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import MenuApp from "./MenuApp";

function App() {
  return <MenuApp />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
