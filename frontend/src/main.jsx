import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { TimezoneProvider } from "./TimezoneContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <TimezoneProvider>
        <App />
      </TimezoneProvider>
    </BrowserRouter>
  </React.StrictMode>
);
