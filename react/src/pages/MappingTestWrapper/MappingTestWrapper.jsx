import { useState } from "react";
import QboIdMappingModal from "../../components/QboIdMappingModal/QboIdMappingModal";

// Dummy Data to replicate your entities and menu_items tables
const DUMMY_DATA = [
  { internalId: 1, name: "Ali Traders", type: "Customer", currentQbId: null },
  {
    internalId: 5,
    name: "Tech Supply Co.",
    type: "Vendor",
    currentQbId: "105",
  },
  {
    internalId: 1001,
    name: "Cold Brew Coffee",
    type: "MenuItem",
    currentQbId: null,
  },
];

export default function MappingTestWrapper() {
  const [items, setItems] = useState(DUMMY_DATA);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    entityName: "",
    entityId: null,
    type: "",
  });

  const openModal = (item) => {
    setModalConfig({
      isOpen: true,
      entityName: item.name,
      entityId: item.internalId,
      type: item.type,
    });
  };

  const handleSuccess = (payload) => {
    console.log("Successfully mapped! Payload sent to backend:", payload);
    setItems((prev) =>
      prev.map((item) =>
        item.internalId === payload.internal_id && item.type === payload.type
          ? { ...item, currentQbId: payload.quickbooks_id }
          : item,
      ),
    );
  };

  return (
    <div className="p-8 bg-atmosphere min-h-screen text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Isolated Mapping Dashboard</h1>
          <p className="text-sm text-slate-400">
            Testing wrapper for the QB mapping modal.
          </p>
        </div>

        <div className="bg-card/80 border border-white/15 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-300">
                  Internal ID
                </th>
                <th className="px-6 py-4 font-semibold text-slate-300">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-300">Type</th>
                <th className="px-6 py-4 font-semibold text-slate-300">
                  QBO ID
                </th>
                <th className="px-6 py-4 text-right font-semibold text-slate-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {items.map((item) => (
                <tr
                  key={`${item.type}-${item.internalId}`}
                  className="hover:bg-slate-800/30"
                >
                  <td className="px-6 py-4">{item.internalId}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-slate-400">{item.type}</td>
                  <td className="px-6 py-4">
                    {item.currentQbId ? (
                      <span className="bg-accent/20 text-accent px-2 py-1 rounded text-xs font-mono">
                        {item.currentQbId}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unmapped</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(item)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      {item.currentQbId ? "Remap ID" : "Map ID"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QboIdMappingModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        entityName={modalConfig.entityName}
        entityId={modalConfig.entityId}
        type={modalConfig.type}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
