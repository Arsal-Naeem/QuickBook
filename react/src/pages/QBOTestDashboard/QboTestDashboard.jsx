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
          <div className="flex items-center gap-4">
            <Link to="/qb-defaults" className="text-accent underline">
              QB Defaults
            </Link>
            <Link to="/" className="text-accent underline">
              Back to Home
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items Section */}
          <div className="bg-card/80 p-6 rounded-3xl border border-white/15">
            <h2 className="text-xl font-bold mb-4">Items</h2>
            <div className="flex flex-col space-y-3">
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/items/createItem", "POST", {
                    name: "Sample Item 48",
                    type: "Inventory",
                    sku: "ITM-020",
                    description: "A fresh sample product",
                    price: 99.99,
                    qtyOnHand: 50,
                  })
                }
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/items/updateItem", "POST", {
                    qbItemId: "1", // Triggers the Update logic on the backend
                    name: "Updated Item Name",
                    type: "Service",
                    sku: "ITM-002-UPDATED",
                    description: "Updated product description",
                    price: 120.0,
                  })
                }
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
                onClick={() =>
                  fetchApi("/api/qbo/customers/pushCustomer", "POST", {
                    name: "Sample Customer",
                    phone: "555-555-5555",
                    email: "sample.customer@example.com",
                    address: "123 Main Street, Mountain View, CA 94043",
                    type: "Customer",
                  })
                }
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/customers/pushCustomer", "POST", {
                    qbEntityId: "1", // Triggers the Update logic on the backend
                    name: "Updated Customer Name",
                    phone: "555-000-0000",
                    email: "updated.customer@example.com",
                    address: "456 New Street, Sunnyvale, CA 94086",
                    type: "Customer",
                  })
                }
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Update
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/customers/getAllCustomers", "GET")
                }
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
                onClick={() =>
                  fetchApi("/api/qbo/vendors/pushVendor", "POST", {
                    name: "Sample Vendor",
                    phone: "555-111-2222",
                    email: "sample.vendor@example.com",
                    address: "789 Vendor Lane, San Jose, CA 95101",
                    type: "Vendor",
                  })
                }
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Create
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/vendors/pushVendor", "POST", {
                    qbEntityId: "1", // Triggers the Update logic on the backend
                    name: "Updated Vendor Name",
                    phone: "555-999-8888",
                    email: "updated.vendor@example.com",
                    address: "321 Updated Blvd, Fremont, CA 94536",
                    type: "Vendor",
                  })
                }
                className="bg-accent text-ink px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-300 transition"
              >
                Update
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  fetchApi("/api/qbo/vendors/getAllVendors", "GET")
                }
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
