import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import "./index.css";
import FormFillApp from "./forms/FormFillApp";
import MenuApp from "./menu/MenuApp";
import ReservationApp from "./reservations/ReservationApp";

function GlobalInputSpaceFix() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;
      if (!isEditable) return;
      event.stopPropagation();
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);

  return null;
}

function App() {
  return (
    <Routes>
      <Route path="/menu" element={<MenuApp />} />
      <Route path="/menu/:companyId" element={<MenuApp />} />
      <Route path="/order" element={<MenuApp customerOrdersMode />} />
      <Route path="/order/:companyId" element={<MenuApp customerOrdersMode />} />
      <Route path="/order/status/:orderId" element={<MenuApp customerOrdersMode />} />
      <Route path="/order/:companyId/status/:orderId" element={<MenuApp customerOrdersMode />} />
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
      <GlobalInputSpaceFix />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HeroUIProvider>
  </React.StrictMode>
);
