"use client";
import { useEffect } from "react";
export default function PWARegister() {
  useEffect(() => { navigator.serviceWorker?.register("/sw.js").catch(console.error); }, []);
  return null;
}
