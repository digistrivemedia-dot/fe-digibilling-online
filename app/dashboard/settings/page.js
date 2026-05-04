'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useShopStore } from '@/store/useShopStore';
import { HiCog, HiOfficeBuilding, HiDocument, HiCollection } from 'react-icons/hi';

import ShopSettingsTab from '@/components/settings/ShopSettingsTab';
import InvoiceSettingsTab from '@/components/settings/InvoiceSettingsTab';
// import ProformaSettingsTab from '@/components/settings/PeoformaSettingsTab';
// import QuotationSettingsTab from '@/components/settings/QuoatationSettingsTab';
import BusinessTypeTab from '@/components/settings/BusinessTypeTab';

const TABS = [
  { id: 'shop', label: 'Shop Settings', icon: HiOfficeBuilding },
  { id: 'invoice', label: 'Invoice Settings', icon: HiDocument },
  // { id: 'proforma', label: 'Proforma Invoice', icon: HiDocument },
  // { id: 'quotation', label: 'Quotation', icon: HiCollection },
  { id: 'business', label: 'Business Type', icon: HiCog },
];

export default function Settings() {
  const { user, loading } = useAuth();
  const { loading: settingsLoading, settled, fetchShopSettings } = useShopStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('shop');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchShopSettings();
    }
  }, [user, fetchShopSettings]);

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/50">
              <HiCog className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your application settings and preferences</p>
            </div>
          </div>
        </div>

        {!settled && settingsLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-20 shadow-sm">
            <LoadingSpinner size="lg" text="Loading settings..." />
          </div>
        ) : (
          <>
        {/* Tab Bar */}
        <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'shop' && <ShopSettingsTab />}
        {activeTab === 'invoice' && <InvoiceSettingsTab />}
        {/* {activeTab === 'proforma' && <ProformaSettingsTab />} */}
        {/* {activeTab === 'quotation' && <QuotationSettingsTab />} */}
        {activeTab === 'business' && <BusinessTypeTab />}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
