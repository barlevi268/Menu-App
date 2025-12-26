import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import "./index.css";
import FormFillApp from "./forms/FormFillApp";
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
      <Route path="/reservations/:companyId" element={<ReservationApp />} />
      <Route path="/form" element={<FormFillApp />} />
      <Route path="/form/:id" element={<FormFillApp />} />
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HeroUIProvider>
  </React.StrictMode>
);
