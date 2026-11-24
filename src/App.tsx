/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SwayPalmProvider, useSwayPalm } from './context/SwayPalmContext';
import { NavbarAndShell } from './components/NavbarAndShell';
import { AuthModal } from './components/AuthModal';
import { HomeFeedView } from './components/HomeFeedView';
import {
  BusinessProfileView,
  ExploreBusinessesView,
} from './components/ExploreAndProfileViews';
import { CartCheckoutDrawer, MarketplaceView } from './components/MarketplaceAndCart';
import { ChatView, GroupsView } from './components/ChatAndGroupsViews';
import {
  FriendsNetworkView,
  NotificationsView,
  SavedPostsView,
} from './components/FriendsAndNotificationsViews';
import {
  AdminPanelView,
  AdvertiseSubscriptionView,
  DashboardView,
} from './components/DashboardAdvertiseAdminViews';
import { CallOverlayModal } from './components/CallOverlayModal';
import { SettingsKitView } from './components/SettingsKitView';
import { OfflineIndicator } from './components/PWAInstallControls';

const PageRouter: React.FC = () => {
  const { activePage, toasts } = useSwayPalm();

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomeFeedView />;
      case 'explore':
        return <ExploreBusinessesView />;
      case 'profile':
        return <BusinessProfileView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'chat':
        return <ChatView />;
      case 'groups':
        return <GroupsView />;
      case 'friends':
        return <FriendsNetworkView />;
      case 'saved':
        return <SavedPostsView />;
      case 'dashboard':
        return <DashboardView />;
      case 'advertise':
        return <AdvertiseSubscriptionView />;
      case 'notifications':
        return <NotificationsView />;
      case 'admin':
        return <AdminPanelView />;
      case 'settings':
        return <SettingsKitView />;
      default:
        return <HomeFeedView />;
    }
  };

  return (
    <NavbarAndShell>
      {renderPage()}
      <AuthModal />
      <CartCheckoutDrawer />
      <CallOverlayModal />
      <OfflineIndicator />

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 md:bottom-5 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-lg text-xs font-semibold shadow-md border ${
                t.tone === 'error'
                  ? 'bg-red-900 text-white border-red-800'
                  : t.tone === 'success'
                    ? 'bg-[#0A4D2E] text-white border-[#083D24]'
                    : 'bg-neutral-900 text-white border-neutral-800'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </NavbarAndShell>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SwayPalmProvider>
        <PageRouter />
      </SwayPalmProvider>
    </ErrorBoundary>
  );
}
