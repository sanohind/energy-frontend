import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

export default function TwoStepVerification() {
  return (
    <>
      <PageMeta
        title="React.js Two Step Verification Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Two Step Verification Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <TwoStepVerification />
      </AuthLayout>
    </>
  );
}
