import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import OrderHistoryTable from "../../components/tables/OrderHistoryTable";

export default function BasicTables() {
  return (
    <>
      <PageMeta
        title="React.js product histroy tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js product histroy tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="product histroy tables" />
      <div className="space-y-6">
        <ComponentCard title="product histroy table 1">
          <OrderHistoryTable />
        </ComponentCard>
      </div>
    </>
  );
}
