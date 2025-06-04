// File: components/ProviderDetails.tsx

"use client";

import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/button";
import Modal from "@/components/ui/modal";
import AddAttributeProvider from "@/components/ui/addAttributeProvider";
import EditButton from "@/components/ui/editButton";
import { useCatalogStore } from "@/store/catalog";

interface ProviderInterface {
  id: string;
  online: boolean;
  description: string;
  videoUrl?: string | null;
  grossVolume?: number | null;
  calendlyCalendarUri?: string | null;
  scheduleLink?: string | null;
  reading?: { id: string; name: string; description?: string };
  specialities: { id: string; name: string; description?: string; price?: number }[];
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
  const [mainSpecialityId, setMainSpecialityId] = useState(provider.mainSpeciality?.id || "");
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

  const [newSpecialityName, setNewSpecialityName] = useState("");
  const [newToolName, setNewToolName] = useState("");
  const [newReadingName, setNewReadingName] = useState("");
  const [newPackageService, setNewPackageService] = useState("");
  const [newPackageSessions, setNewPackageSessions] = useState("");
  const [newPackagePrice, setNewPackagePrice] = useState("");
  const [newPackageExpiresAt, setNewPackageExpiresAt] = useState("");

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
    setSelectedPackages(provider.providerPackages.map((p) => p.id));
  }, [provider.id]);

  const toggleMulti = (val: string, key: EditModalType) => {
    if (key === "Specialities") {
      setSelectedSpecialities((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (key === "Tools") {
      setSelectedTools((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (key === "Packages") {
      setSelectedPackages((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    }
  };

  const handleSaveChanges = async (type: EditModalType) => {
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
        body = {
          packages: selectedPackages.map((id) => {
            const pkg = localProvider.providerPackages.find((p) => p.id === id);
            return pkg
              ? {
                  service: pkg.service,
                  totalSessions: pkg.totalSessions,
                  price: pkg.price,
                  expiresAt: pkg.expiresAt,
                }
              : {};
          }),
        };
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
      scope: 'read_write'
    });
    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  };

  // ================= CALENDLY CONNECT (cu PKCE) =====================
  const handleCalendlyConnect = async () => {
    const resp = await fetch("/api/calendly/oauth/start", { credentials: "include" });
    if (!resp.ok) {
      console.error("Nu am putut iniția PKCE:", await resp.text());
      return;
    }
    const { codeChallenge } = await resp.json();

    const clientId = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!;
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
  };

  // Render Stripe & Calendly connect sections
  const renderIntegrationSections = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Stripe Connect */}
      <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
        <div>
          <strong>Cont Stripe:</strong>{" "}
          {localProvider.stripeAccountId ? (
            <span className="text-green-700">
              Conectat ({localProvider.stripeAccountId})
            </span>
          ) : (
            <span className="text-red-600">Nu ești conectat</span>
          )}
        </div>
        {!localProvider.stripeAccountId ? (
          <Button
            onClick={() => {
              window.location.href = createStripeConnectUrl();
            }}
            className="mt-2 px-4 py-2 bg-primaryColor text-white rounded hover:bg-primaryColor-dark"
          >
            Conectează-te cu Stripe
          </Button>
        ) : (
          <Button
            onClick={async () => {
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
            }}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Deconectează Stripe
          </Button>
        )}
      </div>

      {/* Calendly Connect */}
      <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
        <div>
          <strong>Conectare Calendly:</strong>{" "}
          {localProvider.isCalendlyConnected ? (
            <span className="text-green-700">Conectat</span>
          ) : (
            <span className="text-red-600">Nu ești conectat</span>
          )}
        </div>
        {!localProvider.isCalendlyConnected ? (
          <Button
            onClick={handleCalendlyConnect}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Conectează-te cu Calendly
          </Button>
        ) : (
          <Button
            onClick={async () => {
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
            }}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Deconectare Calendly
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* =================== Edit Modals =================== */}
      {showEditModal === "VideoUrl" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Video URL">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <Button
            onClick={() => handleSaveChanges("VideoUrl")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "ScheduleLink" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Link Programări">
          <input
            type="text"
            value={scheduleLink}
            onChange={(e) => setScheduleLink(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <Button
            onClick={() => handleSaveChanges("ScheduleLink")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "MainSpeciality" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Specialitatea Principală">
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {specialitiesStore.map((spec) => (
              <AddAttributeProvider
                key={spec.id}
                title={spec.name}
                selected={mainSpecialityId === spec.id}
                setSelect={() => setMainSpecialityId(spec.id)}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("MainSpeciality")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "MainTool" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Unealta Principală">
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {toolsStore.map((tool) => (
              <AddAttributeProvider
                key={tool.id}
                title={tool.name}
                selected={mainToolId === tool.id}
                setSelect={() => setMainToolId(tool.id)}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("MainTool")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "Description" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Descrierea">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded h-32"
          />
          <Button
            onClick={() => handleSaveChanges("Description")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
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
            />
            <span>Online</span>
          </label>
          <Button
            onClick={() => handleSaveChanges("Status")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "Specialities" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Specializările">
          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={newSpecialityName}
              onChange={(e) => setNewSpecialityName(e.target.value)}
              placeholder="Adaugă specialitate nouă"
              className="flex-1 p-2 border rounded"
            />
            <Button
              className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
              disabled={!newSpecialityName.trim()}
              onClick={async () => {
                const name = newSpecialityName.trim();
                const res = await fetch("/api/add/specialities", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setNewSpecialityName("");
                }
              }}
            >
              Adaugă
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {specialitiesStore.map((spec) => (
              <AddAttributeProvider
                key={spec.id}
                title={spec.name}
                selected={selectedSpecialities.includes(spec.name)}
                setSelect={() => toggleMulti(spec.name, "Specialities")}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Specialities")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "Tools" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Uneltele">
          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              placeholder="Adaugă unealtă nouă"
              className="flex-1 p-2 border rounded"
            />
            <Button
              className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
              disabled={!newToolName.trim()}
              onClick={async () => {
                const name = newToolName.trim();
                const res = await fetch("/api/add/tools", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setNewToolName("");
                }
              }}
            >
              Adaugă
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {toolsStore.map((tool) => (
              <AddAttributeProvider
                key={tool.id}
                title={tool.name}
                selected={selectedTools.includes(tool.name)}
                setSelect={() => toggleMulti(tool.name, "Tools")}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Tools")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "Reading" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Reading">
          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={newReadingName}
              onChange={(e) => setNewReadingName(e.target.value)}
              placeholder="Adaugă reading nou"
              className="flex-1 p-2 border rounded"
            />
            <Button
              className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
              disabled={!newReadingName.trim()}
              onClick={async () => {
                const name = newReadingName.trim();
                const res = await fetch("/api/add/readings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setNewReadingName("");
                }
              }}
            >
              Adaugă
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {readingsStore.map((r) => (
              <AddAttributeProvider
                key={r.id}
                title={r.name}
                selected={readingId === r.id}
                setSelect={() => setReadingId(r.id)}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Reading")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {showEditModal === "Packages" && (
        <Modal closeModal={() => setShowEditModal("")} title="Editează Tipurie de Sedinte">
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={newPackageService}
              onChange={(e) => setNewPackageService(e.target.value)}
              placeholder="Serviciu"
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              value={newPackageSessions}
              onChange={(e) => setNewPackageSessions(e.target.value)}
              placeholder="Număr sesiuni"
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              value={newPackagePrice}
              onChange={(e) => setNewPackagePrice(e.target.value)}
              placeholder="Preț (RON)"
              className="w-full p-2 border rounded"
            />
            <input
              type="date"
              value={newPackageExpiresAt}
              onChange={(e) => setNewPackageExpiresAt(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <Button
              className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
              disabled={
                !newPackageService.trim() ||
                !newPackageSessions ||
                !newPackagePrice
              }
              onClick={async () => {
                const pkg = {
                  providerId: localProvider.id,
                  service: newPackageService.trim(),
                  totalSessions: parseInt(newPackageSessions, 10),
                  price: parseFloat(newPackagePrice),
                  expiresAt: newPackageExpiresAt || null,
                };
                const res = await fetch("/api/add/packages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(pkg),
                });
                if (res.ok) {
                  setNewPackageService("");
                  setNewPackageSessions("");
                  setNewPackagePrice("");
                  setNewPackageExpiresAt("");
                }
              }}
            >
              Adaugă
            </Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {localProvider.providerPackages.map((pkg) => (
              <AddAttributeProvider
                key={pkg.id}
                title={`${pkg.service} – ${pkg.totalSessions} sesiuni @ ${pkg.price} RON – expiră: ${
                  pkg.expiresAt ?? "—"
                }`}
                selected={selectedPackages.includes(pkg.id)}
                setSelect={() => toggleMulti(pkg.id, "Packages")}
              />
            ))}
          </div>
          <Button
            onClick={() => handleSaveChanges("Packages")}
            className="mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor"
          >
            Salvează
          </Button>
        </Modal>
      )}

      {/* =================== Detalii Furnizor =================== */}
      <div className="max-w-3xl mx-auto bg-white shadow rounded p-6">
        <h3 className="text-lg font-semibold mb-4">Detalii Furnizor</h3>

        {/* Stripe & Calendly Integration */}
        {renderIntegrationSections()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {/* Descriere */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Descriere:</strong> {localProvider.description || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Description")} />
          </div>

          {/* Stare */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Stare:</strong> {localProvider.online ? "Online" : "Offline"}
            </div>
          </div>

          {/* Video URL */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Video URL:</strong> {localProvider.videoUrl || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("VideoUrl")} />
          </div>

          {/* Link Programări */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Link Programări:</strong> {localProvider.scheduleLink || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("ScheduleLink")} />
          </div>

          {/* Reading */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Citire:</strong> {localProvider.reading?.name || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Reading")} />
          </div>

          {/* Specialitate Principală */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Specialitate Principală:</strong>{" "}
              {localProvider.mainSpeciality?.name || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("MainSpeciality")} />
          </div>

          {/* Unealtă Principală */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Unealtă Principală:</strong>{" "}
              {localProvider.mainTool?.name || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("MainTool")} />
          </div>

          {/* Specializări */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Specializări:</strong>{" "}
              {localProvider.specialities.map((s) => s.name).join(", ") || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Specialities")} />
          </div>

          {/* Unelte */}
          <div className="h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Unelte:</strong>{" "}
              {localProvider.tools.map((t) => t.name).join(", ") || "—"}
            </div>
            <EditButton showEditModal={() => setShowEditModal("Tools")} />
          </div>

          {/* Pachete (două coloane) */}
          <div className="col-span-1 sm:col-span-2 h-full flex flex-col justify-between bg-gray-50 p-4 rounded">
            <div>
              <strong>Tipuri de Sedinte:</strong>
              <ul className="list-disc ml-6 mt-2">
                {localProvider.providerPackages.map((pkg) => (
                  <li key={pkg.id}>
                    {pkg.service} – {pkg.totalSessions} sesiuni @ {pkg.price} RON – expiră:{" "}
                    {pkg.expiresAt ?? "—"}
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
