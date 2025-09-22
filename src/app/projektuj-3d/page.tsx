import type { Metadata } from "next";
import Planner3DClient from "./Planner3DClient";

export const metadata: Metadata = {
  title: "Projektuj kuchnię w 3D | Kuchnie AI",
  description:
    "Zaprojektuj wymarzoną kuchnię na telefonie. Dobierz układ, kolory i wyposażenie w interaktywnym podglądzie 3D.",
};

export default function Projektuj3DPage() {
  return <Planner3DClient />;
}
