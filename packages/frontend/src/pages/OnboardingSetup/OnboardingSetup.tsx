import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  AlarmIcon,
  PencilIcon,
  SparklesOutlineIcon,
} from "../../assets/icons";
import { OnboardingForm } from "../../components/OnboardingForm/OnboardingForm";
import { Button, ButtonVariant } from "../../components/ui/Button";
import { requestNotificationPermission } from "../../utils/notifications";
import { useGenerateAiProgram } from "../../api/ai";
import { useGetOnboarding } from "../../api/onboarding";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./OnboardingSetup.module.css";

enum Step {
  Profile = "profile",
  Notifications = "notifications",
  Plan = "plan",
  AiDetails = "ai-details",
}

const FREQUENCY_OPTIONS = [2, 3, 4, 5, 6];
const DURATION_OPTIONS = [4, 6, 8, 10, 12];

// Cheap, deterministic starting point the user can accept as-is or tweak —
// no extra AI round trip needed just to suggest a default.
function suggestPlanDefaults(experienceLevel?: string, goal?: string) {
  const frequency = experienceLevel === "BEGINNER" ? 3 : 4;
  const durationWeeks = goal === "GAIN_STRENGTH" ? 10 : 8;
  return { frequency, durationWeeks };
}

const OnboardingSetup = () => {
  const navigate = useNavigate();
  const { data: onboardingData } = useGetOnboarding();
  const { setActiveProgram } = useSettings();
  const [step, setStep] = useState<Step>(Step.Profile);
  const [isRequestingNotifications, setRequestingNotifications] =
    useState(false);
  const generateProgram = useGenerateAiProgram();

  const defaults = suggestPlanDefaults(
    onboardingData?.onboarding?.experienceLevel,
    onboardingData?.onboarding?.goal,
  );
  const [frequency, setFrequency] = useState(defaults.frequency);
  const [durationWeeks, setDurationWeeks] = useState(defaults.durationWeeks);

  const handleEnableNotifications = async () => {
    setRequestingNotifications(true);
    try {
      await requestNotificationPermission();
    } finally {
      setRequestingNotifications(false);
      setStep(Step.Plan);
    }
  };

  const handleGenerateWithAi = () => {
    generateProgram.mutate(
      { durationWeeks, frequency },
      {
        onSuccess: (data) => {
          setActiveProgram({ id: data.program.id, name: data.program.name });
          navigate("/programs", { replace: true });
        },
      },
    );
  };

  const handleCreateMyself = () => {
    navigate("/programs/create", { replace: true });
  };

  if (step === Step.Notifications) {
    return (
      <div className={styles.page}>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={styles.iconWrapper}>
            <AlarmIcon size={32} />
          </div>
          <h1 className={styles.title}>Stay on track</h1>
          <p className={styles.subtitle}>
            Turn on notifications for rest timer alerts and reminders to log
            your weight, so you never lose momentum.
          </p>
        </div>

        <div className={styles.footer}>
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isRequestingNotifications}
            >
              {isRequestingNotifications
                ? "Requesting..."
                : "Enable notifications"}
            </Button>
            <Button
              type="button"
              variant={ButtonVariant.Ghost}
              onClick={() => setStep(Step.Plan)}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === Step.Plan) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>How do you want to start?</h1>
          <p className={styles.subtitle}>
            You can always create more programs later.
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.options}>
            <button
              type="button"
              className={styles.optionCard}
              onClick={() => setStep(Step.AiDetails)}
            >
              <div className={styles.optionIcon}>
                <SparklesOutlineIcon size={22} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionTitle}>Generate with AI</span>
                <span className={styles.optionDescription}>
                  Answer a few questions and get a program built for you.
                </span>
              </div>
            </button>

            <button
              type="button"
              className={styles.optionCard}
              onClick={handleCreateMyself}
            >
              <div className={styles.optionIcon}>
                <PencilIcon size={22} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionTitle}>Create it myself</span>
                <span className={styles.optionDescription}>
                  Start from a template or build your own from scratch.
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            type="button"
            variant={ButtonVariant.Ghost}
            onClick={() => setStep(Step.Notifications)}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === Step.AiDetails) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set your plan</h1>
          <p className={styles.subtitle}>
            We picked sensible defaults — tweak them if you'd like, or just
            hit generate.
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.planFields}>
            <div className={styles.planField}>
              <span className={styles.planFieldLabel}>Sessions per week</span>
              <div className={styles.optionPills}>
                {FREQUENCY_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.pill} ${frequency === value ? styles.pillActive : ""}`}
                    onClick={() => setFrequency(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.planField}>
              <span className={styles.planFieldLabel}>Duration</span>
              <div className={styles.optionPills}>
                {DURATION_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.pill} ${durationWeeks === value ? styles.pillActive : ""}`}
                    onClick={() => setDurationWeeks(value)}
                  >
                    {value}w
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={generateProgram.isPending}
              icon={
                generateProgram.isPending ? (
                  <Loader2 size={18} className={styles.spinner} />
                ) : undefined
              }
            >
              {generateProgram.isPending ? null : "Generate program"}
            </Button>
            <Button
              type="button"
              variant={ButtonVariant.Ghost}
              onClick={() => setStep(Step.Plan)}
              disabled={generateProgram.isPending}
            >
              Back
            </Button>
            {generateProgram.isError && (
              <p className={styles.errorText}>
                Something went wrong. Try again.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formPage}>
      <h1 className={styles.title}>Tell us about you</h1>
      <p className={styles.subtitle}>We use this to tailor your training.</p>
      <OnboardingForm onSaved={() => setStep(Step.Notifications)} />
    </div>
  );
};

export default OnboardingSetup;
