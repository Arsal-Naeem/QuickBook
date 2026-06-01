import { useState, useEffect, useCallback } from "react";
import { LuX, LuSearch } from "react-icons/lu";

function getResultLabel(result) {
  return result?.displayName ?? result?.name ?? "Unnamed";
}

function getResultMeta(result) {
  if (result?.companyName) return result.companyName;
  if (result?.accountType) return result.accountType;
  return "";
}

export default function QboIdMappingModal({
  isOpen,
  onClose,
  entityName,
  entityId,
  type,
  onSuccess,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const getSearchEndpoint = useCallback(() => {
    switch (type) {
      case "Customer":
        return "/api/qbo/mapping/searchCustomers";
      case "Vendor":
        return "/api/qbo/mapping/searchVendors";
      case "MenuItem":
        return "/api/qbo/mapping/searchItems";
      default:
        return "";
    }
  }, [type]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const endpoint = getSearchEndpoint();

    if (!endpoint) {
      setError(`Invalid entity type provided: ${type}`);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError("");

      try {
        const response = await fetch(
          `${endpoint}?q=${encodeURIComponent(trimmedTerm)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to search QuickBooks records.");
        }

        if (!isCancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setSearchResults([]);
          setError(err.message || "Search failed.");
        }
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, isOpen, getSearchEndpoint, type]);

  const handleSave = async () => {
    if (!selectedResult) return;

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        internal_id: entityId,
        quickbooks_id: selectedResult.id,
        type: type,
      };

      const response = await fetch("/api/qbo/mapping/updateQbId", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update ID.");

      if (onSuccess) onSuccess(payload);
      handleClose();
    } catch (err) {
      setError(err.message || "An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedResult(null);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Map QuickBooks Entity
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Mapping{" "}
              <span className="font-semibold text-accent">{entityName}</span>{" "}
              (Internal ID: {entityId})
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="relative mb-4">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedResult(null);
              }}
              placeholder={`Search ${type}s in QuickBooks...`}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          <div className="h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/50">
            {searchTerm.trim().length < 2 ? (
              <p className="p-4 text-sm text-slate-400 text-center mt-4">
                Type at least 2 characters to search QBO.
              </p>
            ) : isSearching ? (
              <p className="p-4 text-sm text-slate-400 text-center mt-4">
                Searching...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center mt-4">
                No results found.
              </p>
            ) : (
              searchResults.map((result) => {
                const label = getResultLabel(result);
                const meta = getResultMeta(result);
                const isSelected = selectedResult?.id === result.id;

                return (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-700/50 last:border-0 transition ${
                      isSelected
                        ? "bg-accent/20 text-accent"
                        : "hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    <p className="font-medium text-sm">{label}</p>
                    {meta && (
                      <p className="text-xs opacity-70 mt-0.5">{meta}</p>
                    )}
                    <p className="text-xs opacity-50 mt-1">
                      QB ID: {result.id}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-3 bg-slate-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedResult || isSaving}
            className="bg-accent text-ink px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Map & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
