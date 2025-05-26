// src/lib/handleLogout.ts
import { signOut } from "next-auth/react";

export default function handleLogout(slug: string) {
  const url = `/api/user/${slug}`;
  const body = JSON.stringify({ online: false });
  console.log("in asta: ewq")
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    // fallback
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(console.error);
  }

  signOut();
}
