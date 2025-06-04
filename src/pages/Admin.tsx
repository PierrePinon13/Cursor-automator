
import { SidebarInset } from "@/components/ui/sidebar";
import CustomSidebarTrigger from "@/components/ui/CustomSidebarTrigger";
import AdminDashboard from "@/components/admin/AdminDashboard";

const Admin = () => {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
        <CustomSidebarTrigger />
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Administration</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <AdminDashboard />
      </div>
    </SidebarInset>
  );
};

export default Admin;
