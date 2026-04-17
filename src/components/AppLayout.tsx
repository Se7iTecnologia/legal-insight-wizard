import { Outlet } from "react-router-dom";
import { AppSidebar, SidebarProvider, useSidebarState } from "./AppSidebar";
import { AppFooter } from "./AppFooter";

function LayoutInner() {
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main
        className={`transition-[margin] duration-200 p-4 pt-16 lg:pt-6 lg:p-6 flex flex-col min-h-screen ${
          collapsed ? "lg:ml-[60px]" : "lg:ml-60"
        }`}
      >
        <div className="flex-1">
          <Outlet />
        </div>
        <AppFooter />
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
