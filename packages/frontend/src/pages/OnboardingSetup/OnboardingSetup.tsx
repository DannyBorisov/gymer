import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Dumbbell,
  TrendingUp,
  Brain,
  Target,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  AlarmIcon,
  PencilIcon,
  SparklesOutlineIcon,
} from "../../assets/icons";
import { Button, ButtonVariant } from "../../components/ui/Button";
import { ScrollableInput } from "../../components/ScrollableInput/ScrollableInput";
import { requestNotificationPermission } from "../../utils/notifications";
import { useGenerateAiProgram } from "../../api/ai";
import {
  useGetOnboarding,
  useSaveOnboarding,
  type ExperienceLevel,
  type Gender,
  type Goal,
} from "../../api/onboarding";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./OnboardingSetup.module.css";

enum Step {
  Welcome = 0,
  WeightHeight = 1,
  ExplainRIR = 2,
  AgeGender = 3,
  ExplainRestTimer = 4,
  Goal = 5,
  Experience = 6,
  ExplainProgression = 7,
  ExplainPlateau = 8,
  Notifications = 9,
  Plan = 10,
  AiDetails = 11,
}

const TOTAL_STEPS = 12;

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: "BUILD_MUSCLE", label: "Build muscle", description: "Gain size and definition" },
  { value: "GAIN_STRENGTH", label: "Gain strength", description: "Lift heavier weights" },
  { value: "LOSE_FAT", label: "Lose fat", description: "Get leaner while keeping muscle" },
  { value: "MAINTAIN", label: "Maintain", description: "Stay where you are" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "BEGINNER", label: "Beginner", hint: "0-1 years" },
  { value: "INTERMEDIATE", label: "Intermediate", hint: "1-3 years" },
  { value: "ADVANCED", label: "Advanced", hint: "3+ years" },
];

const FREQUENCY_OPTIONS = [2, 3, 4, 5, 6];
const DURATION_OPTIONS = [4, 6, 8, 10, 12];

function suggestPlanDefaults(experienceLevel?: string, goal?: string) {
  const frequency = experienceLevel === "BEGINNER" ? 3 : 4;
  const durationWeeks = goal === "GAIN_STRENGTH" ? 10 : 8;
  return { frequency, durationWeeks };
}

const OnboardingSetup = () => {
  const navigate = useNavigate();
  const { data: onboardingData } = useGetOnboarding();
  const saveOnboarding = useSaveOnboarding();
  const { setActiveProgram } = useSettings();
  const [step, setStep] = useState<Step>(Step.Welcome);
  const [isRequestingNotifications, setRequestingNotifications] = useState(false);
  const generateProgram = useGenerateAiProgram();
  const [hasAnimated, setHasAnimated] = useState(false);

  // Form state
  const [weight, setWeight] = useState("75");
  const [height, setHeight] = useState("175");
  const [age, setAge] = useState("25");
  const [gender, setGender] = useState<Gender | "">("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");

  // AI plan state
  const defaults = suggestPlanDefaults(experienceLevel, goal);
  const [frequency, setFrequency] = useState(defaults.frequency);
  const [durationWeeks, setDurationWeeks] = useState(defaults.durationWeeks);

  // Load existing data
  useEffect(() => {
    if (onboardingData?.onboarding) {
      const o = onboardingData.onboarding;
      if (o.weight) setWeight(String(o.weight));
      if (o.height) setHeight(String(o.height));
      if (o.age) setAge(String(o.age));
      if (o.gender) setGender(o.gender);
      if (o.goal) setGoal(o.goal);
      if (o.experienceLevel) setExperienceLevel(o.experienceLevel);
    }
  }, [onboardingData]);

  // Trigger animations on step change
  useEffect(() => {
    setHasAnimated(false);
    const timer = setTimeout(() => setHasAnimated(true), 50);
    return () => clearTimeout(timer);
  }, [step]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const saveProfile = () => {
    if (!weight || !height || !age || !gender || !goal || !experienceLevel) return;
    saveOnboarding.mutate(
      {
        weight: +weight,
        height: +height,
        age: +age,
        gender: gender as Gender,
        goal: goal as Goal,
        experienceLevel: experienceLevel as ExperienceLevel,
      },
      { onSuccess: nextStep }
    );
  };

  const handleEnableNotifications = async () => {
    setRequestingNotifications(true);
    try {
      await requestNotificationPermission();
    } finally {
      setRequestingNotifications(false);
      nextStep();
    }
  };

  const handleGenerateWithAi = () => {
    generateProgram.mutate(
      { durationWeeks, frequency },
      {
        onSuccess: (data) => {
          setActiveProgram({ id: data.program.id, name: data.program.name });
          navigate("/", { replace: true });
        },
      }
    );
  };

  const handleCreateMyself = () => {
    navigate("/programs/create", { replace: true });
  };

  // Handlers for ScrollableInput
  const handleWeightAdjust = (delta: number) => {
    const newVal = Math.max(30, Math.min(200, parseFloat(weight) + delta));
    setWeight(String(newVal));
  };

  const handleHeightAdjust = (delta: number) => {
    const newVal = Math.max(100, Math.min(250, parseFloat(height) + delta));
    setHeight(String(newVal));
  };

  const handleAgeAdjust = (delta: number) => {
    const newVal = Math.max(13, Math.min(100, parseFloat(age) + delta));
    setAge(String(newVal));
  };

  // ============================================================
  // STEP: Welcome
  // ============================================================
  if (step === Step.Welcome) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.welcomeIcon} ${hasAnimated ? styles.animateIn : ""}`}>
            <Dumbbell size={48} strokeWidth={1.5} />
          </div>
          <h1 className={`${styles.welcomeTitle} ${hasAnimated ? styles.animateIn : ""}`}>
            Let's build your training
          </h1>
          <p className={`${styles.welcomeSubtitle} ${hasAnimated ? styles.animateIn : ""}`}>
            We'll set up your profile and show you how the app helps you progress. Takes about 2 minutes.
          </p>
        </div>
        <div className={styles.footer}>
          <Button onClick={nextStep}>
            Get started
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Weight & Height
  // ============================================================
  if (step === Step.WeightHeight) {
    const isValid = weight && height;
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>Your measurements</h1>
          <p className={styles.subtitle}>Used to personalize your experience</p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
          <div className={styles.scrollInputRow}>
            <ScrollableInput
              label="Weight (kg)"
              value={weight}
              onChange={setWeight}
              onAdjust={handleWeightAdjust}
              step={1}
              min={30}
              max={200}
              inputMode="decimal"
            />
            <ScrollableInput
              label="Height (cm)"
              value={height}
              onChange={setHeight}
              onAdjust={handleHeightAdjust}
              step={1}
              min={100}
              max={250}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!isValid}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Explain RIR
  // ============================================================
  if (step === Step.ExplainRIR) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.conceptIcon} ${hasAnimated ? styles.animateIn : ""}`}>
            <Target size={36} />
          </div>
          <span className={`${styles.conceptLabel} ${hasAnimated ? styles.animateIn : ""}`}>
            Key Concept
          </span>
          <h1 className={`${styles.conceptTitle} ${hasAnimated ? styles.animateIn : ""}`}>
            What is RIR?
          </h1>
          <div className={`${styles.conceptBody} ${hasAnimated ? styles.animateIn : ""}`}>
            <p>
              <strong>RIR</strong> stands for <strong>Reps in Reserve</strong> —
              how many reps you could still do before failure.
            </p>
            <div className={styles.rirExample}>
              <div className={styles.rirRow}>
                <span className={styles.rirValue}>RIR 3</span>
                <span className={styles.rirDesc}>You stopped with 3 reps left in the tank</span>
              </div>
              <div className={styles.rirRow}>
                <span className={styles.rirValue}>RIR 1</span>
                <span className={styles.rirDesc}>Almost at failure, just 1 rep left</span>
              </div>
              <div className={styles.rirRow}>
                <span className={styles.rirValue}>RIR 0</span>
                <span className={styles.rirDesc}>Complete failure, no more reps possible</span>
              </div>
            </div>
            <p className={styles.conceptTip}>
              Tracking RIR helps you train at the right intensity — hard enough to grow,
              smart enough to recover.
            </p>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Got it</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Age & Gender
  // ============================================================
  if (step === Step.AgeGender) {
    const isValid = age && gender;
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>A bit more about you</h1>
          <p className={styles.subtitle}>Helps us tailor recommendations</p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
          <div className={styles.ageInputWrap}>
            <ScrollableInput
              label="Age"
              value={age}
              onChange={setAge}
              onAdjust={handleAgeAdjust}
              step={1}
              min={13}
              max={100}
              inputMode="numeric"
            />
          </div>
          <fieldset className={styles.choices}>
            <legend>Gender</legend>
            <div className={styles.choiceRow}>
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className={gender === g.value ? styles.choiceActive : styles.choice}
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!isValid}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Explain Rest Timer
  // ============================================================
  if (step === Step.ExplainRestTimer) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.conceptIcon} ${styles.conceptIconBlue} ${hasAnimated ? styles.animateIn : ""}`}>
            <Timer size={36} />
          </div>
          <span className={`${styles.conceptLabel} ${hasAnimated ? styles.animateIn : ""}`}>
            Feature
          </span>
          <h1 className={`${styles.conceptTitle} ${hasAnimated ? styles.animateIn : ""}`}>
            Smart Rest Timer
          </h1>
          <div className={`${styles.conceptBody} ${hasAnimated ? styles.animateIn : ""}`}>
            <p>
              Between sets, rest is crucial. Our timer tracks your rest and
              announces when it's time to go.
            </p>
            <div className={styles.featureHighlight}>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>🔔</span>
                <span>Voice countdown: "3... 2... 1... time!"</span>
              </div>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>📱</span>
                <span>Works with phone in your pocket</span>
              </div>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>⚡</span>
                <span>One tap to start after each set</span>
              </div>
            </div>
            <p className={styles.conceptTip}>
              No more guessing or watching the clock — just train.
            </p>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Continue</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Goal
  // ============================================================
  if (step === Step.Goal) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>What's your goal?</h1>
          <p className={styles.subtitle}>This shapes your program recommendations</p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
          <div className={styles.goalGrid}>
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`${styles.goalCard} ${goal === g.value ? styles.goalCardActive : ""}`}
                onClick={() => setGoal(g.value)}
              >
                <span className={styles.goalLabel}>{g.label}</span>
                <span className={styles.goalDesc}>{g.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!goal}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Experience Level
  // ============================================================
  if (step === Step.Experience) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>Experience level</h1>
          <p className={styles.subtitle}>How long have you been lifting?</p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
          <div className={styles.experienceList}>
            {EXPERIENCE_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`${styles.experienceCard} ${experienceLevel === l.value ? styles.experienceCardActive : ""}`}
                onClick={() => setExperienceLevel(l.value)}
              >
                <span className={styles.experienceLabel}>{l.label}</span>
                <span className={styles.experienceHint}>{l.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button
              onClick={saveProfile}
              disabled={!experienceLevel || saveOnboarding.isPending}
            >
              {saveOnboarding.isPending ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Explain Progressive Overload
  // ============================================================
  if (step === Step.ExplainProgression) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.conceptIcon} ${styles.conceptIconGreen} ${hasAnimated ? styles.animateIn : ""}`}>
            <TrendingUp size={36} />
          </div>
          <span className={`${styles.conceptLabel} ${hasAnimated ? styles.animateIn : ""}`}>
            How We Help
          </span>
          <h1 className={`${styles.conceptTitle} ${hasAnimated ? styles.animateIn : ""}`}>
            Progressive Overload
          </h1>
          <div className={`${styles.conceptBody} ${hasAnimated ? styles.animateIn : ""}`}>
            <p>
              To get stronger, you need to gradually increase the challenge.
              We track every set and show you exactly what to beat.
            </p>
            <div className={styles.featureHighlight}>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>📊</span>
                <span>See your last weight & reps during each set</span>
              </div>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>🎯</span>
                <span>"Beat 82.5kg × 8" prompts to push you forward</span>
              </div>
              <div className={styles.featureRow}>
                <span className={styles.featureIcon}>🏆</span>
                <span>Celebrate when you hit new personal records</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Continue</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Explain Plateau Detection
  // ============================================================
  if (step === Step.ExplainPlateau) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.conceptIcon} ${styles.conceptIconPurple} ${hasAnimated ? styles.animateIn : ""}`}>
            <Brain size={36} />
          </div>
          <span className={`${styles.conceptLabel} ${hasAnimated ? styles.animateIn : ""}`}>
            Smart Insights
          </span>
          <h1 className={`${styles.conceptTitle} ${hasAnimated ? styles.animateIn : ""}`}>
            Plateau Detection
          </h1>
          <div className={`${styles.conceptBody} ${hasAnimated ? styles.animateIn : ""}`}>
            <p>
              Stuck at the same weight for weeks? Our AI analyzes your training
              history and spots when you've hit a plateau.
            </p>
            <div className={styles.plateauVisual}>
              <div className={styles.plateauGraph}>
                <div className={styles.plateauLine} />
                <div className={styles.plateauAlert}>
                  <Sparkles size={14} />
                  <span>Plateau detected</span>
                </div>
              </div>
            </div>
            <p className={styles.conceptTip}>
              You'll see this in Analytics so you know when it's time to
              change things up — new rep ranges, exercises, or a deload week.
            </p>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.navRow}>
            <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Continue</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Notifications
  // ============================================================
  if (step === Step.Notifications) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={`${styles.content} ${styles.centeredContent}`}>
          <div className={`${styles.iconWrapper} ${hasAnimated ? styles.animateIn : ""}`}>
            <AlarmIcon size={32} />
          </div>
          <h1 className={`${styles.title} ${hasAnimated ? styles.animateIn : ""}`}>Stay on track</h1>
          <p className={`${styles.subtitle} ${styles.maxWidth} ${hasAnimated ? styles.animateIn : ""}`}>
            Get rest timer alerts and reminders to log your weight,
            so you never miss a beat.
          </p>
        </div>
        <div className={styles.footer}>
          <div className={styles.actions}>
            <Button
              onClick={handleEnableNotifications}
              disabled={isRequestingNotifications}
            >
              {isRequestingNotifications ? "Requesting..." : "Enable notifications"}
            </Button>
            <Button variant={ButtonVariant.Ghost} onClick={nextStep}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: Plan Choice
  // ============================================================
  if (step === Step.Plan) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>Create your program</h1>
          <p className={styles.subtitle}>You can always create more later</p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
          <div className={styles.options}>
            <button
              type="button"
              className={styles.optionCard}
              onClick={nextStep}
            >
              <div className={styles.optionIcon}>
                <SparklesOutlineIcon size={22} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionTitle}>Generate with AI</span>
                <span className={styles.optionDescription}>
                  Get a personalized program based on your goals
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
                <span className={styles.optionTitle}>Create myself</span>
                <span className={styles.optionDescription}>
                  Start from a template or build from scratch
                </span>
              </div>
            </button>
          </div>
        </div>
        <div className={styles.footer}>
          <Button variant={ButtonVariant.Ghost} onClick={prevStep}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP: AI Details
  // ============================================================
  if (step === Step.AiDetails) {
    return (
      <div className={styles.page}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>Customize your plan</h1>
          <p className={styles.subtitle}>
            We've picked sensible defaults based on your goals
          </p>
        </div>
        <div className={`${styles.content} ${hasAnimated ? styles.animateIn : ""}`}>
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
              <span className={styles.planFieldLabel}>Program duration</span>
              <div className={styles.optionPills}>
                {DURATION_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.pill} ${durationWeeks === value ? styles.pillActive : ""}`}
                    onClick={() => setDurationWeeks(value)}
                  >
                    {value} weeks
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.actions}>
            <Button
              onClick={handleGenerateWithAi}
              disabled={generateProgram.isPending}
              icon={
                generateProgram.isPending ? (
                  <Loader2 size={18} className={styles.spinner} />
                ) : (
                  <Sparkles size={18} />
                )
              }
            >
              {generateProgram.isPending ? "Generating..." : "Generate program"}
            </Button>
            <Button
              variant={ButtonVariant.Ghost}
              onClick={prevStep}
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

  return null;
};

export default OnboardingSetup;
