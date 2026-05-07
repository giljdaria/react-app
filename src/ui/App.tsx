import { NavLink, Route, Routes } from "react-router-dom";
import { OverviewPage } from "./pages/OverviewPage";
import { ImportPage } from "./pages/ImportPage";
import { ClustersPage } from "./pages/ClustersPage";
import { TrendsPage } from "./pages/TrendsPage";

export function App() {
  return (
    <div>
      <header className="nav">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <strong>AI-анализатор обратной связи</strong>
          <span className="badge">demo</span>
        </div>
        <nav className="navlinks">
          <NavLink className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} to="/">
            Обзор
          </NavLink>
          <NavLink
            className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}
            to="/import"
          >
            Импорт
          </NavLink>
          <NavLink
            className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}
            to="/clusters"
          >
            Кластеры
          </NavLink>
          <NavLink
            className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}
            to="/trends"
          >
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

