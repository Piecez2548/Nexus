import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/index.css";

import { ThemeEffect } from "@/providers/ThemeEffect";
import { seedDatabase } from "@/database/seed";

async function bootstrap() {
  await seedDatabase();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeEffect />
      <App />
    </React.StrictMode>
  );
}

bootstrap();
