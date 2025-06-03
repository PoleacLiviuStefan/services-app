// /app/profil/page.tsx
// Nu mai trebuie Suspense în acest caz:
export const dynamic = "force-dynamic";


import React from "react";
import ProfilePage from "@/components/ProfilePage";

export default function ProfilPage() {
  return <ProfilePage />;
}
