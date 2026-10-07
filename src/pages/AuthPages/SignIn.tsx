import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Energy Monitoring"
        description="Sign in to the Energy Monitoring dashboard"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
