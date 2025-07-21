import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import FoodCostCalculator from "./FoodCostCalculator";

function App() {
  return <FoodCostCalculator />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
