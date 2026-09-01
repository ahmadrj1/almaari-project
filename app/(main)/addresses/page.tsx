"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";

interface Address {
  id: string;
  street: string;
  city: string | null;
  country: string | null;
  zipCode: string | null;
  isDefault: boolean;
}

export default function SavedAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Form State
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete Confirm Dialog
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.data || []);
      } else {
        showToast("error", "Failed to retrieve addresses");
      }
    } catch {
      showToast("error", "An error occurred loading addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setAddresses(data.data || []);
        } else {
          if (!ignore) showToast("error", "Failed to retrieve addresses");
        }
      } catch {
        if (!ignore) showToast("error", "An error occurred loading addresses");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNewClick = () => {
    setStreet("");
    setCity("");
    setCountry("");
    setZipCode("");
    setIsDefault(addresses.length === 0);
    setEditingAddress(null);
    setShowAddNew(true);
  };

  const handleEditClick = (address: Address) => {
    setStreet(address.street);
    setCity(address.city || "");
    setCountry(address.country || "");
    setZipCode(address.zipCode || "");
    setIsDefault(address.isDefault);
    setEditingAddress(address);
    setShowAddNew(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { street, city, country, zipCode, isDefault };
      let res;

      if (editingAddress) {
        res = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast(
          "success",
          `Address ${editingAddress ? "updated" : "added"} successfully`,
        );
        await fetchAddresses();
        setShowAddNew(false);
      } else {
        showToast("error", "Failed to save address");
      }
    } catch {
      showToast("error", "An error occurred saving address details");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        showToast("success", "Default address updated");
        await fetchAddresses();
      } else {
        showToast("error", "Failed to set default address");
      }
    } catch {
      showToast("error", "An error occurred updating default address");
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    try {
      const res = await fetch(`/api/addresses/${addressToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Address removed successfully");
        await fetchAddresses();
      } else {
        showToast("error", "Failed to remove address");
      }
    } catch {
      showToast("error", "An error occurred removing address");
    } finally {
      setAddressToDelete(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-[#2979FF]">
          Saved Addresses
        </h1>
        <button
          onClick={handleAddNewClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition duration-150 shadow-sm text-sm"
        >
          + Add Address
        </button>
      </div>

      {loading && addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 font-medium">
            Loading addresses...
          </p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <span className="text-4xl">📍</span>
          <h3 className="mt-2 text-sm font-bold text-gray-900">
            No saved addresses
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add an address for a quicker checkout.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {addresses.map((address) => {
              return (
                <div
                  key={address.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 transition duration-150 ${address.isDefault ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 mt-1 sm:mt-0 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 text-xl shadow-sm shrink-0">
                      📍
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">
                          {address.street}
                        </span>
                        {address.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {address.city}
                        {address.city && address.zipCode ? ", " : ""}
                        {address.zipCode}
                      </div>
                      <div className="text-sm text-gray-500">
                        {address.country}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 sm:mt-0 self-end sm:self-auto">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl transition"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEditClick(address)}
                      className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition"
                      title="Edit Address"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setAddressToDelete(address.id)}
                      className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition"
                      title="Remove Address"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        isOpen={showAddNew}
        onClose={() => setShowAddNew(false)}
        title={editingAddress ? "Edit Address" : "Add New Address"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Street Address
            </label>
            <input
              required
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Zip/Postal Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="10001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="United States"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isDefault"
              className="text-sm font-medium text-gray-700"
            >
              Set as default address
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowAddNew(false)}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 transition flex items-center gap-2 shadow-sm text-sm"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmDialog
        isOpen={!!addressToDelete}
        onClose={() => setAddressToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Address"
        message={"Are You Sure You Want To\nRemove This Address!"}
        confirmText="Yes"
        cancelText="No"
      />
    </div>
  );
}
