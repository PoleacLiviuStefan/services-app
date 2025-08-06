// File: components/ProviderDetails.tsx

"use client";

import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/button";
import Modal from "@/components/ui/modal";
import AddAttributeProvider from "@/components/ui/addAttributeProvider";
import EditButton from "@/components/ui/editButton";
import { useCatalogStore } from "@/store/catalog";
import { useTranslation } from "@/hooks/useTranslation";

interface ProviderInterface {
  id: string;
  online: boolean;
  description: string;
  videoUrl?: string | null;
  grossVolume?: number | null;
  calendlyCalendarUri?: string | null;
  scheduleLink?: string | null;
  reading?: { id: string; name: string; description?: string };
  specialities: {
    id: string;
    name: string;
    description?: string;
    price?: number;
  }[];
  tools: { id: string; name: string; description?: string }[];
  mainSpeciality?: { id: string; name: string };
  mainTool?: { id: string; name: string };
  reviewsCount: number;
  averageRating: number;
  providerPackages: {
    id: string;
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  }[];
  stripeAccountId?: string | null;
  isCalendlyConnected: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface ProviderDetailsProps {
  provider: ProviderInterface;
}

type EditModalType =
  | ""
  | "Specialities"
  | "Tools"
  | "Packages"
  | "VideoUrl"
  | "ScheduleLink"
  | "Reading"
  | "MainSpeciality"
  | "MainTool"
  | "Description"
  | "Status";

const ProviderDetails: FC<ProviderDetailsProps> = ({ provider }) => {
  console.log("provider: ", provider);
  const { t } = useTranslation();
  const specialitiesStore = useCatalogStore((s) => s.specialities);
  const readingsStore = useCatalogStore((s) => s.readings);
  const toolsStore = useCatalogStore((s) => s.tools);

  const [localProvider, setLocalProvider] = useState(provider);
  const [showEditModal, setShowEditModal] = useState<EditModalType>("");

  // Form fields
  const [description, setDescription] = useState(provider.description || "");
  const [status, setStatus] = useState(provider.online);
  const [videoUrl, setVideoUrl] = useState(provider.videoUrl || "");
  const [scheduleLink, setScheduleLink] = useState(provider.scheduleLink || "");
  const [readingId, setReadingId] = useState(provider.reading?.id || "");
  const [mainSpecialityId, setMainSpecialityId] = useState(
    provider.mainSpeciality?.id || ""
  );
  const [mainToolId, setMainToolId] = useState(provider.mainTool?.id || "");
  const [selectedSpecialities, setSelectedSpecialities] = useState<string[]>(
    provider.specialities.map((s) => s.name)
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    provider.tools.map((t) => t.name)
  );
  const [selectedPackages, setSelectedPackages] = useState<string[]>(
    provider.providerPackages.map((p) => p.id)
  );
  
  // 🆕 Loading states pentru diferite operații
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStripe, setLoadingStripe] = useState<boolean>(false);
  const [loadingCalendly, setLoadingCalendly] = useState<boolean>(false);
  const [savingMapping, setSavingMapping] = useState<boolean>(false);
  const [deletingPackage, setDeletingPackage] = useState<string | null>(null); // ID-ul pachetului care se șterge

  const [newSpecialityName, setNewSpecialityName] = useState("");
  const [newToolName, setNewToolName] = useState("");
  const [newReadingName, setNewReadingName] = useState("");
  const [newPackageService, setNewPackageService] = useState("");
  const [newPackageSessions, setNewPackageSessions] = useState("");
  const [newPackagePrice, setNewPackagePrice] = useState("");
  const [newPackageExpiresAt, setNewPackageExpiresAt] = useState("");
  const [calendlyEvents, setCalendlyEvents] = useState<CalendlyEventType[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [newPackageEventUri, setNewPackageEventUri] = useState<string>("");
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);

  const router = useRouter();

  // Sync initial state only when provider.id changes (prevents resetting on avatar update)
  useEffect(() => {
    setLocalProvider(provider);
    setDescription(provider.description || "");
    setStatus(provider.online);
    setVideoUrl(provider.videoUrl || "");
    setScheduleLink(provider.scheduleLink || "");
    setReadingId(provider.reading?.id || "");
    setMainSpecialityId(provider.mainSpeciality?.id || "");
    setMainToolId(provider.mainTool?.id || "");
    setSelectedSpecialities(provider.specialities.map((s) => s.name));
    setSelectedTools(provider.tools.map((t) => t.name));

    const initMap: Mapping = {};
    provider.providerPackages.forEach((pkg) => {
      if (pkg.calendlyEventTypeUri) initMap[pkg.calendlyEventTypeUri] = pkg.id;
    });
    setMapping(initMap);
  }, [localProvider.id]);

  const toggleMulti = (val: string, key: EditModalType) => {
    if (key === "Specialities") {
      setSelectedSpecialities((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (key === "Tools") {
      setSelectedTools((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    }
  };

  useEffect(() => {
    if (!provider.isCalendlyConnected) return;
    setLoadingCalendly(true);
    fetch(`/api/provider/${provider.id}/calendly/event-types`)
      .then(r => r.json())
      .then(data => {
        setCalendlyEvents(data.eventTypes);
        setMapping(data.existingMappings || {});
      })
      .catch(console.error)
      .finally(() => setLoadingCalendly(false));
  }, [provider.id, provider.isCalendlyConnected]);

  const handleMapChange = (uri: string, pkgId: string) => {
    setMapping((prev) => ({ ...prev, [uri]: pkgId }));
  };

  const saveAllMappings = async () => {
    setSavingMapping(true);
    try {
      for (const [uri, pkgId] of Object.entries(mapping)) {
        if (!pkgId) continue;
        await fetch(
          `/api/provider/${localProvider.id}/calendly/map-event-type`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              calendlyEventTypeUri: uri,
              packageId: pkgId,
            }),
          }
        );
      }
      alert("Mapări salvate cu succes!");
    } catch (e) {
      console.error(e);
      alert("Eroare la salvarea mapărilor.");
    } finally {
      setSavingMapping(false);
    }
  };

  const mappingInverse = React.useMemo((): Record<string, string> => {
    const inv: Record<string, string> = {};
    Object.entries(mapping).forEach(([uri, pkgId]) => {
      inv[pkgId] = uri;
    });
    return inv;
  }, [mapping]);

  const handleAddRequest = async (type: EditModalType) => {
    setLoading(true); // 🆕 Loading pentru cereri noi
    try {
      let url = "";
      let body: any = {};
      if (type === "Specialities") {
        url = "/api/requests/speciality";
        body = { name: newSpecialityName.trim() };
      } else if (type === "Tools") {
        url = "/api/requests/tool";
        body = { name: newToolName.trim() };
      } else if (type === "Reading") {
        url = "/api/requests/reading";
        body = { name: newReadingName.trim() };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert("Cerere trimisă pentru aprobare.");
        if (type === "Specialities") setNewSpecialityName("");
        if (type === "Tools") setNewToolName("");
        if (type === "Reading") setNewReadingName("");
      } else {
        console.error(await res.text());
        alert("Eroare la trimiterea cererii.");
      }
    } finally {
      setLoading(false); // 🆕
    }
  };

  const handleSaveChanges = async (type: EditModalType) => {
    setLoading(true); // 🆕 Loading pentru salvare modificări
    try {
      let url = `/api/provider/${localProvider.id}`;
      let body: any = {};

      switch (type) {
        case "Description":
          url += "/description";
          body = { description };
          break;
        case "Status":
          url += "/status";
          body = { online: status };
          break;
        case "VideoUrl":
          url += "/video-url";
          body = { videoUrl };
          break;
        case "ScheduleLink":
          url += "/schedule-link";
          body = { scheduleLink };
          break;
        case "Reading":
          url += "/reading";
          body = { readingId };
          break;
        case "MainSpeciality":
          url += "/main-speciality";
          body = { mainSpecialityId };
          break;
        case "MainTool":
          url += "/main-tool";
          body = { mainToolId };
          break;
        case "Specialities":
          url += "/specialities";
          body = { specialities: selectedSpecialities };
          break;
        case "Tools":
          url += "/tools";
          body = { tools: selectedTools };
          break;
        case "Packages":
          url += "/packages";
          body = { packages: selectedPackages };
          break;
        default:
          return;
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;

      setLocalProvider((prev) => {
        const copy = { ...prev } as any;
        switch (type) {
          case "Description":
            copy.description = description;
            break;
          case "Status":
            copy.online = status;
            break;
          case "VideoUrl":
            copy.videoUrl = videoUrl;
            break;
          case "ScheduleLink":
            copy.scheduleLink = scheduleLink;
            break;
          case "Reading":
            copy.reading = readingsStore.find((r) => r.id === readingId) || null;
            break;
          case "MainSpeciality":
            copy.mainSpeciality =
              specialitiesStore.find((s) => s.id === mainSpecialityId) || null;
            break;
          case "MainTool":
            copy.mainTool = toolsStore.find((t) => t.id === mainToolId) || null;
            break;
          case "Specialities":
            copy.specialities = selectedSpecialities.map((name) => ({
              id: specialitiesStore.find((s) => s.name === name)!.id,
              name,
            }));
            break;
          case "Tools":
            copy.tools = selectedTools.map((name) => ({
              id: toolsStore.find((t) => t.name === name)!.id,
              name,
            }));
            break;
          case "Packages":
            copy.providerPackages = prev.providerPackages.filter((p) =>
              selectedPackages.includes(p.id)
            );
            break;
        }
        return copy;
      });

      setShowEditModal("");
    } finally {
      setLoading(false); // 🆕
    }
  };

  //edit package
  const handleEditClick = (pkg: typeof provider.providerPackages[0]) => {
    setEditingPkgId(pkg.id);
    setNewPackageService(pkg.service);
    setNewPackageSessions(pkg.totalSessions.toString());
    setNewPackagePrice(pkg.price.toString());
    setNewPackageEventUri(pkg.calendlyEventTypeUri || "");
    setShowEditModal("Packages");
  };

  // ================= STRIPE CONNECT =======================
  const createStripeConnectUrl = () => {
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/connect/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: `stripe:${localProvider.id}`,
      "stripe_user[country]": "RO",
      scope: "read_write",
    });
    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  };

  // ================= CALENDLY CONNECT (cu PKCE) =====================
  const handleCalendlyConnect = async () => {
    setLoadingCalendly(true); // 🆕 Loading pentru Calendly
    try {
      const resp = await fetch("/api/calendly/oauth/start", {
        credentials: "include",
      });
      if (!resp.ok) {
        console.error("Nu am putut iniția PKCE:", await resp.text());
        return;
      }
      const { codeChallenge } = await resp.json();
      
      const clientId = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!;
      console.log("clientId:", clientId);
      const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/calendly/oauth/callback`;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state: `calendly:${localProvider.id}`,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      const authorizeUrl = `https://auth.calendly.com/oauth/authorize?${params.toString()}`;
      window.location.href = authorizeUrl;
    } finally {
      setLoadingCalendly(false); // 🆕
    }
  };

  const savePackages = async () => {
    setLoading(true); // 🆕 Loading pentru salvare pachete
    try {
      // Ensure calendlyEventTypeUri selected
      if (!newPackageEventUri) {
        alert(t('providerDetails.calendlySessionTypeRequired'));
        return;
      }
      // Build packages array
      const allPackages = editingPkgId
        ? localProvider.providerPackages.map(p =>
            p.id === editingPkgId
              ? { ...p, service: newPackageService.trim(), totalSessions: +newPackageSessions, price: +newPackagePrice, calendlyEventTypeUri: newPackageEventUri }
              : p
          )
        : [
            ...localProvider.providerPackages,
            { id: '', service: newPackageService.trim(), totalSessions: +newPackageSessions, price: +newPackagePrice, calendlyEventTypeUri: newPackageEventUri }
          ];

      const res = await fetch(`/api/provider/${provider.id}/packages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: allPackages }),
      });
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      const { packages: updated } = await res.json();
      setLocalProvider(prev => ({ ...prev, providerPackages: updated }));
      // reset
      setShowEditModal(""); setEditingPkgId(null);
      setNewPackageService(""); setNewPackageSessions(""); setNewPackagePrice(""); setNewPackageEventUri("");
    } finally {
      setLoading(false); // 🆕
    }
  };

  // 🆕 Handle pentru ștergerea pachetelor cu loading individual
  const handleDeletePackage = async (pkgId: string) => {
    setDeletingPackage(pkgId); // 🆕 Loading pentru pachetul specific
    try {
      const res = await fetch(
        `/api/provider/${provider.id}/packages/${pkgId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        console.error("Eroare la ștergere pachet:", await res.text());
        return;
      }
      const { packages: remaining } = await res.json();
      setLocalProvider(prev => ({ ...prev, providerPackages: remaining }));
    } finally {
      setDeletingPackage(null); // 🆕
    }
  };

  // 🆕 Handle pentru Stripe disconnect cu loading
  const handleStripeDisconnect = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch(
        `/api/provider/${localProvider.id}/stripe-account`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stripeAccountId: null }),
        }
      );
      if (res.ok) {
        setLocalProvider((prev) => ({
          ...prev,
          stripeAccountId: null,
        }));
      }
    } finally {
      setLoadingStripe(false);
    }
  };

  // 🆕 Handle pentru Calendly disconnect cu loading
  const handleCalendlyDisconnect = async () => {
    setLoadingCalendly(true);
    try {
      const res = await fetch(
        `/api/provider/${localProvider.id}/calendly-account`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calendlyCalendarUri: null }),
        }
      );
      if (res.ok) {
        setLocalProvider((prev) => ({
          ...prev,
          calendlyCalendarUri: null,
        }));
      }
    } finally {
      setLoadingCalendly(false);
    }
  };

  // Render Stripe & Calendly connect sections
  const renderIntegrationSections = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Stripe Connect */}
      <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
        <div>
          <strong>{t('providerDetails.stripeAccount')}</strong>{" "}
          {localProvider.stripeAccountId ? (
            <span className="text-green-700">{t('providerDetails.connected')}</span>
          ) : (
            <span className="text-red-600">{t('providerDetails.notConnected')}</span>
          )}
        </div>
        {!localProvider.stripeAccountId ? (
          <Button
            onClick={() => {
              window.location.href = createStripeConnectUrl();
            }}
            className="mt-2 px-4 py-2 bg-primaryColor text-white rounded hover:bg-primaryColor-dark"
          >
            {t('providerDetails.connectWithStripe')}
          </Button>
        ) : (
          <Button
            onClick={handleStripeDisconnect}
            disabled={loadingStripe} // 🆕
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loadingStripe ? t('providerDetails.disconnecting') : t('providerDetails.disconnectStripe')} {/* 🆕 */}
          </Button>
        )}
      </div>

      {/* Calendly Connect */}
      <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
        <div>
          <strong>{t('providerDetails.calendlyConnection')}</strong>{" "}
          {localProvider.isCalendlyConnected ? (
            <span className="text-green-700">{t('providerDetails.connected')}</span>
          ) : (
            <span className="text-red-600">{t('providerDetails.notConnected')}</span>
          )}
        </div>
        {!localProvider.isCalendlyConnected ? (
          <Button
            onClick={handleCalendlyConnect}
            disabled={loadingCalendly} // 🆕
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingCalendly ? t('providerDetails.connecting') : t('providerDetails.connectWithCalendly')} {/* 🆕 */}
          </Button>
        ) : (
          <Button
            onClick={handleCalendlyDisconnect}
            disabled={loadingCalendly} // 🆕
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loadingCalendly ? t('providerDetails.disconnecting') : t('providerDetails.disconnectCalendly')} {/* 🆕 */}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* =================== Edit Modals =================== */}
      {showEditModal === "VideoUrl" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title={t('providerDetails.editVideoUrl')}
        >
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={loading} // 🆕
          />
          <Button
            onClick={() => handleSaveChanges("VideoUrl")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? t('providerDetails.saving') : t('providerDetails.save')} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "ScheduleLink" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title={t('providerDetails.editScheduleLink')}
        >
          <input
            type="text"
            value={scheduleLink}
            onChange={(e) => setScheduleLink(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={loading} // 🆕
          />
          <Button
            onClick={() => handleSaveChanges("ScheduleLink")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? t('providerDetails.saving') : t('providerDetails.save')} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "MainSpeciality" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title={t('providerDetails.editMainSpecialty')}
        >
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {specialitiesStore.map((spec) => (
              <AddAttributeProvider
                key={spec.id}
                title={spec.name}
                selected={mainSpecialityId === spec.id}
                setSelect={() => setMainSpecialityId(spec.id)}
                disabled={loading} // 🆕
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("MainSpeciality")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "MainTool" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title="Editează Unealta Principală"
        >
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {toolsStore.map((tool) => (
              <AddAttributeProvider
                key={tool.id}
                title={tool.name}
                selected={mainToolId === tool.id}
                setSelect={() => setMainToolId(tool.id)}
                disabled={loading} // 🆕
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("MainTool")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Description" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title="Editează Descrierea"
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded h-32"
            disabled={loading} // 🆕
          />
          <Button
            onClick={() => handleSaveChanges("Description")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Status" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Stare">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              disabled={loading} // 🆕
            />
            <span>Online</span>
          </label>
          <Button
            onClick={() => handleSaveChanges("Status")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Specialities" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title="Editează Specializările"
        >
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              value={newSpecialityName}
              onChange={(e) => setNewSpecialityName(e.target.value)}
              placeholder="Adaugă specialitate nouă"
              className="flex-1 p-2 border rounded"
              disabled={loading} // 🆕
            />
            <Button
              className="py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
              disabled={!newSpecialityName.trim() || loading} // 🆕
              onClick={() => handleAddRequest("Specialities")}
            >
              {loading ? "Se adaugă..." : "Adaugă"} {/* 🆕 */}
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {specialitiesStore.map((spec) => (
              <AddAttributeProvider
                key={spec.id}
                title={spec.name}
                selected={selectedSpecialities.includes(spec.name)}
                setSelect={() => toggleMulti(spec.name, "Specialities")}
                disabled={loading} // 🆕
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Specialities")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Tools" && (
        <Modal
          closeModal={() => setShowEditModal("")}
          title="Editează Uneltele"
        >
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              placeholder="Adaugă unealtă nouă"
              className="flex-1 p-2 border rounded"
              disabled={loading} // 🆕
            />
            <Button
              className="py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
              disabled={!newToolName.trim() || loading} // 🆕
              onClick={() => handleAddRequest("Tools")}
            >
              {loading ? "Se adaugă..." : "Adaugă"} {/* 🆕 */}
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {toolsStore.map((tool) => (
              <AddAttributeProvider
                key={tool.id}
                title={tool.name}
                selected={selectedTools.includes(tool.name)}
                setSelect={() => toggleMulti(tool.name, "Tools")}
                disabled={loading} // 🆕
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Tools")}
            disabled={loading} // 🆕
            className="py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Reading" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Reading">
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              value={newReadingName}
              onChange={(e) => setNewReadingName(e.target.value)}
              placeholder="Adaugă reading nou"
              className="flex-1 p-2 border rounded"
              disabled={loading} // 🆕
            />
            <Button
              className="py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
              disabled={!newReadingName.trim() || loading} // 🆕
              onClick={() => handleAddRequest("Reading")}
            >
              {loading ? "Se adaugă..." : "Adaugă"} {/* 🆕 */}
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {readingsStore.map((r) => (
              <AddAttributeProvider
                key={r.id}
                title={r.name}
                selected={readingId === r.id}
                setSelect={() => setReadingId(r.id)}
                disabled={loading} // 🆕
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Reading")}
            disabled={loading} // 🆕
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
          >
            {loading ? "Se salvează..." : "Salvează"} {/* 🆕 */}
          </Button>
        </Modal>
      )}

      {showEditModal === "Packages" && (
        <Modal
          closeModal={() => {
            setShowEditModal("");
            setEditingPkgId(null);
            setNewPackageService("");
            setNewPackageSessions("");
            setNewPackagePrice("");
            setNewPackageEventUri("");
          }}
          title="Editează Tipuri de Ședințe"
        >
          {/* 1. Select obligatoriu pentru evenimentul Calendly */}
          <div className="mb-4">
            <label htmlFor="newPackageEventUri" className="block mb-1 font-medium">
              Tip Ședință Calendly <span className="text-red-500">*</span>
            </label>
            <select
              id="newPackageEventUri"
              className="w-full p-2 border rounded"
              value={newPackageEventUri}
              onChange={e => {setNewPackageEventUri(e.target.value);setAttemptedSave(false);}}
              disabled={loading} // 🆕
            >
              <option value="">— Alege din Calendly —</option>
              {calendlyEvents?.map(et => (
                <option key={et.uri} value={et.uri}>{et.name}</option>
              ))}
            </select>
            { !newPackageEventUri && attemptedSave && (
              <p className="text-red-500 text-sm mt-1">
                Trebuie să selectezi tipul de ședință.
              </p>
            )}
          </div>

          {/* 2. Formular pachet nou sau editare */}
          <div className="mb-4 space-y-2">
            {/* Serviciu */}
            <div>
              <input
                type="text"
                value={newPackageService}
                onChange={e => { setNewPackageService(e.target.value); setAttemptedSave(false); }}
                placeholder="Serviciu"
                className={`w-full p-2 border rounded ${
                  !newPackageService.trim() && attemptedSave ? 'border-red-500' : ''
                }`}
                disabled={loading} // 🆕
              />
              { !newPackageService.trim() && attemptedSave && (
                <p className="text-red-500 text-sm mt-1">
                  Trebuie să introduci un nume de serviciu.
                </p>
              )}
            </div>

            {/* Număr sesiuni */}
            <div>
              <input
                type="number"
                value={newPackageSessions}
                onChange={e => { setNewPackageSessions(e.target.value); setAttemptedSave(false); }}
                placeholder="Număr sesiuni"
                className={`w-full p-2 border rounded ${
                  (!newPackageSessions || Number(newPackageSessions) <= 0) && attemptedSave
                    ? 'border-red-500'
                    : ''
                }`}
                disabled={loading} // 🆕
              />
              { (!newPackageSessions || Number(newPackageSessions) <= 0) && attemptedSave && (
                <p className="text-red-500 text-sm mt-1">
                  Trebuie să introduci un număr de sesiuni valid (>= 2).
                </p>
              )}
            </div>

            {/* Preț */}
            <div>
              <input
                type="number"
                value={newPackagePrice}
                onChange={e => { setNewPackagePrice(e.target.value); setAttemptedSave(false); }}
                placeholder="Preț (RON)"
                className={`w-full p-2 border rounded ${
                  (!newPackagePrice || Number(newPackagePrice) <= 0) && attemptedSave
                    ? 'border-red-500'
                    : ''
                }`}
                disabled={loading} // 🆕
              />
              { (!newPackagePrice || Number(newPackagePrice) <= 0) && attemptedSave && (
                <p className="text-red-500 text-sm mt-1">
                  Trebuie să introduci un preț valid (>= 1 RON).
                </p>
              )}
            </div>
          </div>

          {/* 4. Buton adaugă / salvează */}
          <Button
            className="py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50"
            onClick={() => {
              setAttemptedSave(true);
              savePackages();
            }}
            disabled={
              !newPackageEventUri ||
              !newPackageService.trim() ||
              !newPackageSessions ||
              !newPackagePrice ||
              loading // 🆕
            }
          >
            {loading 
              ? (editingPkgId ? "Se salvează modificările..." : "Se adaugă pachetul...") // 🆕
              : (editingPkgId ? "Salvează modificări" : "Adaugă pachet nou")
            }
          </Button>

          {/* 3. Listare pachete existente */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Pachete existente</h4>
            <ul className="space-y-2 max-h-48 overflow-auto">
              {localProvider.providerPackages.map(pkg => (
                <li key={pkg.id} className="flex justify-between items-center">
                  <span>
                    {pkg.service} – {pkg.totalSessions} sesiuni @ {pkg.price} RON
                  </span>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleEditClick(pkg)}
                      disabled={loading || deletingPackage === pkg.id} // 🆕
                      className="text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Editează
                    </Button>
                    <Button
                      onClick={() => handleDeletePackage(pkg.id)} // 🆕
                      disabled={loading || deletingPackage === pkg.id} // 🆕
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingPackage === pkg.id ? "Se șterge..." : "Șterge"} {/* 🆕 */}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </Modal>
      )}

      {/* =================== Detalii Furnizor =================== */}
      <div className="max-w-3xl mx-auto bg-white shadow rounded p-6">
        <h3 className="text-lg font-semibold mb-4">{t('providerDetails.title')}</h3>

        {/* Stripe & Calendly Integration */}
        {renderIntegrationSections()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {/* Descriere */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.description')}</strong> {localProvider.description || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Description")} />
          </div>

          {/* Stare */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.status')}</strong>{" "}
              {localProvider.online ? t('providerDetails.online') : t('providerDetails.offline')}
            </div>
          </div>

          {/* Video URL */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.videoUrl')}</strong> {localProvider.videoUrl || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("VideoUrl")} />
          </div>

          {/* Reading */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.reading')}</strong> {localProvider.reading?.name || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Reading")} />
          </div>

          {/* Specialitate Principală */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.mainSpeciality')}</strong>{" "}
              {localProvider.mainSpeciality?.name || "—"}
            </div>
            <EditButton
              showEditModal={() => setShowEditModal("MainSpeciality")}
            />
          </div>

          {/* Unealtă Principală */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.mainTool')}</strong>{" "}
              {localProvider.mainTool?.name || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("MainTool")} />
          </div>

          {/* Specializări */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.specialities')}</strong>{" "}
              {localProvider.specialities.map((s) => s.name).join(", ") || "—"}
            </div>
            <EditButton
              showEditModal={() => setShowEditModal("Specialities")}
            />
          </div>

          {/* Unelte */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.tools')}</strong>{" "}
              {localProvider.tools.map((t) => t.name).join(", ") || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Tools")} />
          </div>

          {/* Pachete (două coloane) */}
          <div className="col-span-1 sm:col-span-2 h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>{t('providerDetails.sessionTypes')}</strong>
              <ul className="list-disc ml-6 mt-2">
                {localProvider.providerPackages.map((pkg) => (
                  <li key={pkg.id}>
                    {pkg.service} – {pkg.totalSessions} {t('providerDetails.sessions')} @ {pkg.price}{" "}
                    RON
                  </li>
                )) || <span>—</span>}
              </ul>
            </div>
            <EditButton showEditModal={() => setShowEditModal("Packages")} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProviderDetails;