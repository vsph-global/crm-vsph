import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './navbar';

const DashboardV2Layout = ({ previewBanner, onPreviewExit } = {}) => {
  const location = useLocation();
  const contactId = location.pathname === '/v2/contacts'
    ? new URLSearchParams(location.search).get('contact_id')
    : null;

  // A contact workspace is a document, not a fixed-height nested scrolling panel.
  // Keep the existing shell contract for unrelated CRM routes.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [contactId]);

  return (
    <div className={contactId
      ? "flex min-h-dvh w-full flex-col bg-vsph-grey font-sans"
      : "flex h-screen w-screen flex-col overflow-hidden bg-vsph-grey font-sans"}>
      <Navbar onPreviewExit={onPreviewExit} />
      {previewBanner}
      <main className={contactId ? "flex-1 min-w-0" : "flex-1 min-h-0 overflow-y-auto"}>
        <div className={contactId
          ? "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-7 py-4 pb-8"
          : "px-6 sm:px-8 lg:px-12 py-6"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardV2Layout;
