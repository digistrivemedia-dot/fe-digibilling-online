'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useShopStore } from '@/store/useShopStore';
import { APP_CONFIG } from '@/config/appConfig';
import {
  HiHome,
  HiDocumentAdd,
  HiDocumentText,
  HiCube,
  HiUsers,
  HiCog,
  HiMenu,
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiLogout,
  HiShoppingCart,
  HiReceiptRefund,
  HiTruck,
  HiUserGroup,
  HiViewGrid,
  HiCurrencyRupee,
  HiChartBar,
  HiAdjustments,
} from 'react-icons/hi';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HiHome },
  {
    name: 'Sales',
    icon: HiCurrencyRupee,
    children: [
      { name: 'New Invoice', href: '/dashboard/invoices/new', icon: HiDocumentAdd },
      { name: 'Invoices', href: '/dashboard/invoices', icon: HiDocumentText },
      { name: 'Quotations', href: '/dashboard/quotation', icon: HiDocumentAdd },
      { name: 'Payment Receipts', href: '/dashboard/payment-receipts', icon: HiCurrencyRupee },
      { name: 'Sales Returns', href: '/dashboard/sales-returns', icon: HiReceiptRefund },
      { name: 'Proforma Invoice', href: '/dashboard/porforma-invoice', icon: HiDocumentText },
      { name: 'Delivery Challans', href: '/dashboard/delivery-challan', icon: HiTruck },
    ]
  },
  {
    name: 'Items',
    icon: HiCube,
    children: [
      { name: 'Products', href: '/dashboard/products', icon: HiCube },
      { name: 'Services', href: '/dashboard/services', icon: HiViewGrid },
    ]
  },
  {
    name: 'Purchase',
    icon: HiShoppingCart,
    children: [
      { name: 'Purchases', href: '/dashboard/purchases', icon: HiShoppingCart },
      { name: 'Purchase Returns', href: '/dashboard/purchase-returns', icon: HiReceiptRefund },
    ]
  },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: HiTruck },
  {
    name: 'Inventory',
    icon: HiViewGrid,
    children: [
      { name: 'Inventory View', href: '/dashboard/inventory', icon: HiViewGrid },
      { name: 'Stock Adjustments', href: '/dashboard/stock-adjustments', icon: HiAdjustments },
    ]
  },
  { name: 'Customers', href: '/dashboard/customers', icon: HiUsers },
  { name: 'Expenses', href: '/dashboard/expenses', icon: HiCurrencyRupee },
  {
    name: 'Reports & Ledgers',
    icon: HiChartBar,
    children: [
      { name: 'Reports', href: '/dashboard/reports', icon: HiChartBar },
      { name: 'Ledgers', href: '/dashboard/ledgers', icon: HiDocumentText },
    ]
  },
  { name: 'Settings', href: '/dashboard/settings', icon: HiCog },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { shopSettings, settled: settingsLoaded, fetchShopSettings } = useShopStore();

  // Auto-open groups when navigating to a child route
  useEffect(() => {
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          child => pathname === child.href || pathname.startsWith(child.href + '/')
        );
        if (hasActiveChild) {
          setOpenGroups(prev => ({ ...prev, [item.name]: true }));
        }
      }
    });
  }, [pathname]);

  useEffect(() => {
    // Fetches from cache if still fresh; only hits the network when stale
    fetchShopSettings();
  }, [fetchShopSettings]);

  const shopName = shopSettings?.shopName || APP_CONFIG.shopName;
  const logoSrc = shopSettings?.logo || '/Logo.jpeg';

  const toggleGroup = (name) => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter nav based on feature toggles from settings
  const filteredNavigation = navigation.map(item => {
    if (item.name === 'Items') {
      const filteredChildren = item.children.filter(child => {
        if (child.name === 'Products' && shopSettings?.enableProduct === false) return false;
        if (child.name === 'Services' && shopSettings?.enableService !== true) return false;
        return true;
      });
      return { ...item, children: filteredChildren };
    }
    return item;
  }).filter(item => {
    if (item.name === 'Inventory' && shopSettings?.enableInventory === false) return false;
    if (item.name === 'Items' && (!item.children || item.children.length === 0)) return false;
    return true;
  });

  const allNavHrefs = navigation.flatMap(item =>
    item.children ? item.children.map(c => c.href) : [item.href]
  );
  const hasExactMatch = allNavHrefs.includes(pathname);

  const isItemActive = (href) => {
    if (pathname === href) return true;
    if (href === '/dashboard') return false;
    // If another nav item exactly matches the current path, don't highlight via startsWith
    if (hasExactMatch) return false;
    return pathname.startsWith(href + '/');
  };

  // Renders a single nav item (link)
  const renderNavLink = (item, onClickExtra) => {
    const active = isItemActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClickExtra}
        className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
          : 'text-gray-700 hover:bg-gray-100'
          }`}
        title={collapsed ? item.name : ''}
      >
        <Icon className={`flex-shrink-0 relative z-10 ${collapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'} ${active ? 'text-white' : 'text-gray-500 group-hover:text-emerald-600'
          }`} />
        {!collapsed && <span className="relative z-10 truncate">{item.name}</span>}
      </Link>
    );
  };

  // Renders a group (collapsible section) with children
  const renderNavGroup = (item, onChildClickExtra) => {
    const isOpen = openGroups[item.name] ?? false;
    const hasActiveChild = item.children.some(child => isItemActive(child.href));
    const Icon = item.icon;

    return (
      <div key={item.name}>
        {/* Group header button */}
        <button
          onClick={() => toggleGroup(item.name)}
          className={`w-full group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${hasActiveChild ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700 hover:bg-gray-100'
            }`}
          title={collapsed ? item.name : ''}
        >
          <Icon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'} ${hasActiveChild ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-600'
            }`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left font-semibold">{item.name}</span>
              <HiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${hasActiveChild ? 'text-emerald-600' : 'text-gray-400'
                }`} />
            </>
          )}
        </button>

        {/* Children */}
        {isOpen && (
          <div className={`mt-1 space-y-0.5 ${collapsed ? '' : 'ml-3 pl-3 border-l-2 border-gray-200'}`}>
            {item.children.map(child => {
              const active = isItemActive(child.href);
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.name}
                  href={child.href}
                  onClick={onChildClickExtra}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/40'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  title={collapsed ? child.name : ''}
                >
                  <ChildIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6 mx-auto' : 'w-4 h-4 mr-3'} ${active ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'
                    }`} />
                  {!collapsed && <span className="truncate">{child.name}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${collapsed ? 'lg:w-20' : 'lg:w-72'
          }`}
      >
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-xl">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between h-16 px-6 bg-white relative overflow-hidden border-b border-gray-200">
            {!collapsed && settingsLoaded && (
              <div className="relative h-12 w-40">
                {logoSrc.startsWith('data:') ? (
                  <img
                    key={logoSrc.substring(0, 100)}
                    src={logoSrc}
                    alt={shopName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    key={logoSrc}
                    src={logoSrc}
                    alt={shopName}
                    fill
                    className="object-contain"
                    priority
                  />
                )}
              </div>
            )}
            {collapsed && settingsLoaded && (
              <div className="relative h-10 w-10">
                {logoSrc.startsWith('data:') ? (
                  <img
                    key={logoSrc.substring(0, 100)}
                    src={logoSrc}
                    alt={shopName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    key={logoSrc}
                    src={logoSrc}
                    alt={shopName}
                    fill
                    className="object-contain"
                    priority
                  />
                )}
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="relative z-10 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <HiChevronRight className="w-5 h-5" />
              ) : (
                <HiChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {filteredNavigation.map((item) =>
              item.children
                ? renderNavGroup(item, null)
                : renderNavLink(item, null)
            )}
          </nav>

          {/* User profile */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
            {!collapsed ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 group"
                >
                  <HiLogout className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200"
                  title="Logout"
                >
                  <HiLogout className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-80 h-full bg-white shadow-2xl transform transition-transform duration-300">
            <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
              {settingsLoaded && (
                <div className="relative h-12 w-40">
                  {logoSrc.startsWith('data:') ? (
                    <img
                      key={logoSrc.substring(0, 100)}
                      src={logoSrc}
                      alt={shopName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Image
                      key={logoSrc}
                      src={logoSrc}
                      alt={shopName}
                      fill
                      className="object-contain"
                      priority
                    />
                  )}
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-thin">
              {filteredNavigation.map((item) =>
                item.children
                  ? renderNavGroup(item, () => setSidebarOpen(false))
                  : renderNavLink(item, () => setSidebarOpen(false))
              )}
            </nav>
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                >
                  <HiLogout className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm lg:hidden px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <HiMenu className="w-6 h-6" />
          </button>
          {settingsLoaded && (
            <div className="relative h-10 w-32">
              {logoSrc.startsWith('data:') ? (
                <img
                  key={logoSrc.substring(0, 100)}
                  src={logoSrc}
                  alt={shopName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  key={logoSrc}
                  src={logoSrc}
                  alt={shopName}
                  fill
                  className="object-contain"
                  priority
                />
              )}
            </div>
          )}
          <div className="w-10"></div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
