import { useState } from "react";

function formatAddress(companyAddress) {
  if (!companyAddress) {
    return "Address unavailable";
  }

  const cityRegion = [
    companyAddress.City,
    companyAddress.CountrySubDivisionCode,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    companyAddress.Line1,
    companyAddress.Line2,
    cityRegion,
    companyAddress.PostalCode,
    companyAddress.Country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyPayload, setCompanyPayload] = useState(null);

  const connectToQuickBooks = () => {
    window.location.href = "http://localhost:8000/authUri";
  };

  const getCompanyInfo = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/getCompanyInfo");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to fetch company info. Please authenticate with QuickBooks first.",
        );
      }

      setCompanyPayload(data);
    } catch (error) {
      setCompanyPayload(null);
      setErrorMessage(
        error.message ||
          "Something went wrong while fetching your QuickBooks company details.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const companyInfo = companyPayload?.CompanyInfo;
  const companyName =
    companyInfo?.CompanyName || companyInfo?.LegalName || "Unknown Company";
  const companyAddress = formatAddress(companyInfo?.CompanyAddr);
  const Realm_ID = companyInfo?.Id || "Unavailable";

  return (
    <main className="bg-atmosphere flex min-h-screen items-center justify-center px-4 py-10 text-slate-100">
      <section className="w-full max-w-xl animate-lift-in rounded-3xl border border-white/15 bg-card/80 p-7 shadow-glow backdrop-blur md:p-9">
        <div className="mb-8">
          <p className="mb-2 inline-flex rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            QuickBooks Online
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Business Snapshot
          </h1>
          <p className="mt-2 text-sm text-slate-300 md:text-base">
            Connect your account and pull company details in one click.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={connectToQuickBooks}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Connect to QuickBooks
          </button>

          <button
            type="button"
            onClick={getCompanyInfo}
            disabled={isLoading}
            className="rounded-2xl border border-highlight/60 bg-highlight/10 px-5 py-3 text-sm font-semibold text-highlight transition hover:-translate-y-0.5 hover:bg-highlight/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Fetching..." : "Get Company Info"}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </p>
        ) : null}

        {companyInfo ? (
          <dl className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="animate-fade-rise">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Company Name
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {companyName}
              </dd>
            </div>
            <div className="animate-fade-rise [animation-delay:90ms]">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Address
              </dt>
              <dd className="mt-1 text-slate-100">{companyAddress}</dd>
            </div>
            <div className="animate-fade-rise [animation-delay:180ms]">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Realm ID
              </dt>
              <dd className="mt-1 font-mono text-slate-100">{Realm_ID}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
