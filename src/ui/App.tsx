import { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { OverviewPage } from "./pages/OverviewPage";
import { ImportPage } from "./pages/ImportPage";
import { ClustersPage } from "./pages/ClustersPage";
import { TrendsPage } from "./pages/TrendsPage";

export function App() {
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      // Скрывать header при скролле вниз (после 60px), показывать при скролле вверх
      if (y > lastY.current && y > 60) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      setScrolled(y > 10);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <header
        className="nav"
        style={{
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s",
          boxShadow: scrolled
            ? "0 2px 24px rgba(0,0,0,0.35)"
            : "none",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <strong>AI-анализатор обратной связи</strong>
        </div>
        <nav className="navlinks">
          <NavLink className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} to="/">
            Обзор
          </NavLink>
          <NavLink className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} to="/import">
            Импорт
          </NavLink>
          <NavLink className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} to="/clusters">
            Кластеры
          </NavLink>
          <NavLink className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} to="/trends">
            Тренды
          </NavLink>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/clusters" element={<ClustersPage />} />
          <Route path="/trends" element={<TrendsPage />} />
        </Routes>
      </main>
    </div>
  );
}
