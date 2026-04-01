import { useState } from "react";
import { Link } from "react-router-dom";

export default function QboTestDashboard() {
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchApi = async (url, method = "GET", payload = {}) => {
    setIsLoading(true);
    setApiResponse(null);

    try {
      const options = { method };
      // If it is a POST request send the payload
      if (method === "POST") {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);
      const data = await response.json();
      setApiResponse(data);
    } catch (error) {
      setApiResponse({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-atmosphere min-h-screen text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">QuickBooks API Tests</h1>
            <Link to="/" className="text-accent underline">Back to Home</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items Section */}
          <div className="bg-card/80 p-6 rounded-3xl border border-white/15">
            <h2 className="text-xl font-bold mb-4">Items</h2>
            <div className="flex flex-col space-y-3">
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/items/createItem", "POST", {
                  Name: "Sample Item 2",
                  Type: "NonInventory",
                  IncomeAccountRef: { value: "1", name: "Services" }
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/items/updateItem", "POST", {
                  Id: "1",
                  SyncToken: "0",
                  Name: "Updated Item Name",
                  Type: "NonInventory",
                  IncomeAccountRef: { value: "1", name: "Services" }
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Update
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/items/getAllItems", "GET")}
                className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition"
              >
                Get All
              </button>
            </div>
          </div>

          {/* Customers Section */}
          <div className="bg-card/80 p-6 rounded-3xl border border-white/15">
            <h2 className="text-xl font-bold mb-4">Customers</h2>
            <div className="flex flex-col space-y-3">
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/customers/createCustomer", "POST", {
                  DisplayName: "Sample Customer",
                  PrimaryPhone: { FreeFormNumber: "555-555-5555" },
                  PrimaryEmailAddr: { Address: "sample.customer@example.com" },
                  BillAddr: { Line1: "123 Main Street", City: "Mountain View", CountrySubDivisionCode: "CA", PostalCode: "94043", Country: "US" }
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/customers/updateCustomer", "POST", {
                  Id: "1",
                  SyncToken: "0",
                  DisplayName: "Updated Customer Name",
                  PrimaryPhone: { FreeFormNumber: "555-000-0000" },
                  PrimaryEmailAddr: { Address: "updated.customer@example.com" },
                  BillAddr: { Line1: "456 New Street", City: "Sunnyvale", CountrySubDivisionCode: "CA", PostalCode: "94086", Country: "US" }
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Update
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/customers/getAllCustomers", "GET")}
                className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition"
              >
                Get All
              </button>
            </div>
          </div>

          {/* Vendors Section */}
          <div className="bg-card/80 p-6 rounded-3xl border border-white/15">
            <h2 className="text-xl font-bold mb-4">Vendors</h2>
            <div className="flex flex-col space-y-3">
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/vendors/createVendor", "POST", {
                  DisplayName: "Sample Vendor",
                  PrimaryPhone: { FreeFormNumber: "555-111-2222" },
                  PrimaryEmailAddr: { Address: "sample.vendor@example.com" },
                  BillAddr: { Line1: "789 Vendor Lane", City: "San Jose", CountrySubDivisionCode: "CA", PostalCode: "95101", Country: "US" },
                  Vendor1099: false
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/vendors/updateVendor", "POST", {
                  Id: "1",
                  SyncToken: "0",
                  DisplayName: "Updated Vendor Name",
                  PrimaryPhone: { FreeFormNumber: "555-999-8888" },
                  PrimaryEmailAddr: { Address: "updated.vendor@example.com" },
                  BillAddr: { Line1: "321 Updated Blvd", City: "Fremont", CountrySubDivisionCode: "CA", PostalCode: "94536", Country: "US" },
                  Vendor1099: true
                })}
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Update
              </button>
              <button
                disabled={isLoading}
                onClick={() => fetchApi("/api/qbo/vendors/getAllVendors", "GET")}
                className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition"
              >
                Get All
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 h-[400px] overflow-auto">
          {isLoading ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {apiResponse
                ? JSON.stringify(apiResponse, null, 2)
                : "Response will appear here..."}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
