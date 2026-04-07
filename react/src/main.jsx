import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import QboTestDashboard from "./pages/QBOTestDashboard/QboTestDashboard.jsx";
import QBDefaults from "./pages/QBDefaults/QBDefaults.jsx";
import "./index.css";
import Home from "./pages/Home/App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/test" element={<QboTestDashboard />} />
      <Route path="/qb-defaults" element={<QBDefaults />} />
    </Routes>
  </BrowserRouter>,
);
