import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import MenuApp from "./menu/MenuApp";
import ReservationApp from "./reservations/ReservationApp";

function App() {
  return (
    
      <Routes>
        <Route path="/menu" element={<MenuApp />} />
        <Route path="/menu/:companyId" element={<MenuApp />} />
        {/* Backup Route since some links use it */}
        <Route path="/" element={<MenuApp />} />
        <Route path="/reservations" element={<ReservationApp />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </React.StrictMode>
);
