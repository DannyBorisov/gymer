import { useNavigate } from "react-router-dom";
import { OnboardingForm } from "../../components/OnboardingForm/OnboardingForm";
import styles from "./OnboardingSetup.module.css";

const OnboardingSetup = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tell us about you</h1>
      <p className={styles.subtitle}>
        We use this to tailor your training.
      </p>
      <OnboardingForm onSaved={() => navigate("/home", { replace: true })} />
    </div>
  );
};

export default OnboardingSetup;
