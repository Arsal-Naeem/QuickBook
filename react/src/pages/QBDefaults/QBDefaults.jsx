import { useCallback, useEffect, useMemo, useState } from "react";
import { LuPencil } from "react-icons/lu";
import { Link } from "react-router-dom";

const QBO_SEARCH_SETTINGS = [
  {
    key: "walk_in_customer",
    label: "Walk-In Customer",
    searchEndpoint: "/api/qbo/defaults/searchCustomers",
  },
  {
    key: "payable_account",
    label: "Payable Account",
    searchEndpoint: "/api/qbo/defaults/searchAccounts",
  },
  {
    key: "receivable_account",
    label: "Receivable Account",
    searchEndpoint: "/api/qbo/defaults/searchAccounts",
  },
  {
    key: "tax_code",
    label: "Tax Code",
    searchEndpoint: "/api/qbo/defaults/searchTaxCodes",
  },
  {
    key: "card_control_account",
    label: "Card Control Account",
    searchEndpoint: "/api/qbo/defaults/searchAccounts",
  },
  {
    key: "cash_account",
    label: "Cash Account",
    searchEndpoint: "/api/qbo/defaults/searchAccounts",
  },
  {
    key: "cash_payment_method",
    label: "Cash Payment Method",
    searchEndpoint: "/api/qbo/defaults/searchPaymentMethods",
  },
  {
    key: "card_payment_method",
    label: "Card Payment Method",
    searchEndpoint: "/api/qbo/defaults/searchPaymentMethods",
  },
];

function buildDefaultsMap(rows) {
  const map = {};
  rows.forEach((row) => {
    map[row.Name] = row;
  });
  return map;
}

function getResultLabel(result) {
  return result?.displayName ?? result?.name ?? "Unnamed";
}

function getResultMeta(result) {
  if (result?.companyName) {
    return result.companyName;
  }

  if (result?.accountType) {
    return result.accountType;
  }

  if (result?.taxRateRefId) {
    return `Tax Rate Ref: ${result.taxRateRefId}`;
  }

  if (result?.paymentType) {
    return result.paymentType;
  }

  return "";
}

export default function QBDefaults() {
  const [savedDefaults, setSavedDefaults] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const activeSetting = useMemo(
    () =>
      QBO_SEARCH_SETTINGS.find((setting) => setting.key === editingKey) ?? null,
    [editingKey],
  );

  const fetchSavedDefaults = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setPageLoading(true);
    }

    setPageError("");

    try {
      const response = await fetch("/api/qbo/defaults/getDefaults");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to fetch saved defaults.");
      }

      const map = buildDefaultsMap(Array.isArray(data) ? data : []);
      setSavedDefaults(map);
    } catch (error) {
      setPageError(error.message || "Unable to load QuickBooks defaults.");
    } finally {
      if (showLoading) {
        setPageLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSavedDefaults();
  }, [fetchSavedDefaults]);

  useEffect(() => {
    if (!editingKey || !activeSetting) {
      setIsSearching(false);
      return;
    }

    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `${activeSetting.searchEndpoint}?q=${encodeURIComponent(trimmedTerm)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to search QuickBooks records.");
        }

        if (!isCancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!isCancelled) {
          setSearchResults([]);
          setPageError(error.message || "Search failed.");
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeSetting, editingKey, searchTerm]);

  const resetEditState = useCallback(() => {
    setEditingKey(null);
    setSearchTerm("");
    setSearchResults([]);
    setSelectedResult(null);
  }, []);

  const startEditing = (key) => {
    setPageError("");
    setEditingKey(key);
    setSearchTerm("");
    setSearchResults([]);
    setSelectedResult(null);
  };

  const saveSingleDefault = useCallback(async (payload) => {
    const response = await fetch("/api/qbo/defaults/saveDefault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to save default.");
    }
  }, []);

  const handleSaveDefault = async () => {
    if (!editingKey || !selectedResult) {
      return;
    }

    setIsSaving(true);
    setPageError("");

    try {
      const qbName = getResultLabel(selectedResult);

      await saveSingleDefault({
        name: editingKey,
        qb_id: selectedResult.id ?? null,
        qb_name: qbName,
      });

      if (editingKey === "tax_code") {
        await saveSingleDefault({
          name: "tax_rate_ref",
          qb_id: selectedResult.taxRateRefId ?? null,
          qb_name: "Tax Rate Ref",
        });
      }

      await fetchSavedDefaults(false);
      resetEditState();
    } catch (error) {
      setPageError(error.message || "Unable to save selection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="bg-atmosphere min-h-screen p-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              QuickBooks Defaults
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Configure global defaults used during sync and posting flows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="bg-slate-700 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:bg-slate-600 transition"
            >
              Back to Home
            </Link>
            <Link
              to="/test"
              className="bg-slate-700 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:bg-slate-600 transition"
            >
              API Test Dashboard
            </Link>
          </div>
        </header>

        {pageError ? (
          <p className="rounded-xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {pageError}
          </p>
        ) : null}

        <section className="space-y-4">
          {pageLoading ? (
            <div className="bg-card/80 rounded-3xl border border-white/15 p-6 text-sm text-slate-300">
              Loading saved defaults...
            </div>
          ) : (
            QBO_SEARCH_SETTINGS.map((setting) => {
              const isEditing = editingKey === setting.key;
              const existingValue = savedDefaults[setting.key];

              return (
                <div
                  key={setting.key}
                  className="bg-card/80 rounded-3xl border border-white/15 p-6"
                >
                  <div className="grid gap-4 md:grid-cols-[220px,1fr,120px] md:items-start">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {setting.label}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {!isEditing ? (
                        existingValue ? (
                          <>
                            <p className="text-sm text-white">
                              {existingValue.QB_Name}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {existingValue.QB_ID}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-300">Unassigned</p>
                        )
                      ) : (
                        <>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => {
                              setSearchTerm(event.target.value);
                              setSelectedResult(null);
                            }}
                            placeholder={`Search ${setting.label.toLowerCase()}...`}
                            className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white w-full focus:outline-none focus:ring-2 focus:ring-accent"
                          />

                          <div className="max-h-56 overflow-auto rounded-xl border border-slate-600 bg-slate-900/70">
                            {searchTerm.trim().length < 2 ? (
                              <p className="px-3 py-2 text-sm text-slate-400">
                                Type at least 2 characters to search.
                              </p>
                            ) : isSearching ? (
                              <p className="px-3 py-2 text-sm text-slate-400">
                                Searching...
                              </p>
                            ) : searchResults.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-slate-400">
                                No results found.
                              </p>
                            ) : (
                              searchResults.map((result, index) => {
                                const resultLabel = getResultLabel(result);
                                const resultMeta = getResultMeta(result);
                                const isSelected =
                                  selectedResult?.id === result.id &&
                                  getResultLabel(selectedResult) ===
                                    resultLabel;

                                return (
                                  <button
                                    key={`${result.id ?? "no-id"}-${resultLabel}-${index}`}
                                    type="button"
                                    onClick={() => setSelectedResult(result)}
                                    className={`w-full border-b border-slate-700/60 px-3 py-2 text-left transition last:border-b-0 ${
                                      isSelected
                                        ? "bg-accent/20 text-accent"
                                        : "hover:bg-slate-700/50"
                                    }`}
                                  >
                                    <p className="text-sm font-medium">
                                      {resultLabel}
                                    </p>
                                    {resultMeta ? (
                                      <p className="text-xs text-slate-400">
                                        {resultMeta}
                                      </p>
                                    ) : null}
                                    {result.id ? (
                                      <p className="text-xs text-slate-400">
                                        ID: {result.id}
                                      </p>
                                    ) : null}
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {selectedResult ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
                              <p className="text-sm text-accent">
                                Selected: {getResultLabel(selectedResult)}
                              </p>
                              <button
                                type="button"
                                onClick={handleSaveDefault}
                                disabled={isSaving}
                                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="flex md:justify-end">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => startEditing(setting.key)}
                          className="bg-slate-700 flex gap-2 justify-center items-center text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition"
                        >
                          <LuPencil />
                          Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={resetEditState}
                          className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
