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

export default function AddressesClient() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

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
          method: "PUT",
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
          editingAddress ? "Address updated" : "Address saved",
        );
        setShowAddNew(false);
        await fetchAddresses();
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to save address");
      }
    } catch {
      showToast("error", "An error occurred saving address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    try {
      const res = await fetch(`/api/addresses/${addressToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Address deleted");
        await fetchAddresses();
      } else {
        showToast("error", "Failed to delete address");
      }
    } catch {
      showToast("error", "An error occurred deleting address");
    } finally {
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (address: Address) => {
    try {
      const res = await fetch(`/api/addresses/${address.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...address, isDefault: true }),
      });
      if (res.ok) {
        showToast("success", "Default address updated");
        await fetchAddresses();
      } else {
        showToast("error", "Failed to set default address");
      }
    } catch {
      showToast("error", "An error occurred setting default address");
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
          + Add New Address
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 font-medium">
            Loading saved addresses...
          </p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <span className="text-4xl">📍</span>
          <h3 className="mt-2 text-sm font-bold text-gray-900">
            No saved addresses
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add a shipping address to use during checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-2xl p-6 border transition duration-150 flex flex-col justify-between ${
                address.isDefault
                  ? "border-blue-500 shadow-md ring-1 ring-blue-500/20"
                  : "border-gray-200 shadow-sm hover:border-gray-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">🏠</span>
                  {address.isDefault && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Default Address
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 text-base mb-1">
                  {address.street}
                </p>
                <p className="text-sm text-gray-600">
                  {[address.city, address.country, address.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEditClick(address)}
                    className="text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setAddressToDelete(address.id)}
                    className="text-red-500 hover:text-red-600 font-medium transition"
                  >
                    Delete
                  </button>
                </div>
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address)}
                    className="text-xs text-gray-500 hover:text-gray-900 font-medium transition"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={showAddNew}
        onClose={() => setShowAddNew(false)}
        title={editingAddress ? "Edit Address" : "Add New Address"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="123 Main St, Apt 4B"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip / Postal Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="10001"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Set as default shipping address
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddNew(false)}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!addressToDelete}
        onClose={() => setAddressToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Address"
        message="Are you sure you want to delete this address?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
