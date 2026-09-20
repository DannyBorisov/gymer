import { useEffect, useState } from "react";
import {
  useGetOnboarding,
  useSaveOnboarding,
  type ExperienceLevel,
  type Gender,
  type Goal,
  type Onboarding,
} from "../../api/onboarding";
import { Button } from "../ui/Button";
import styles from "./OnboardingForm.module.css";

const GOALS: { value: Goal; label: string }[] = [
  { value: "LOSE_FAT", label: "Lose fat" },
  { value: "BUILD_MUSCLE", label: "Build muscle" },
  { value: "MAINTAIN", label: "Maintain" },
  { value: "GAIN_STRENGTH", label: "Gain strength" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner (0-1 years)" },
  { value: "INTERMEDIATE", label: "Intermediate (1-3 years)" },
  { value: "ADVANCED", label: "Advanced (3+ years)" },
];

type FormState = {
  weight: string;
  height: string;
  age: string;
  gender: Gender | "";
  goal: Goal | "";
  experienceLevel: ExperienceLevel | "";
};

const toForm = (o: Onboarding): FormState => ({
  weight: String(o.weight),
  height: String(o.height),
  age: String(o.age),
  gender: o.gender,
  goal: o.goal,
  experienceLevel: o.experienceLevel,
});

export function OnboardingForm({ onSaved }: { onSaved?: () => void }) {
  const { data, isLoading } = useGetOnboarding();
  const save = useSaveOnboarding();
  const [form, setForm] = useState<FormState>({
    weight: "",
    height: "",
    age: "",
    gender: "",
    goal: "",
    experienceLevel: "",
  });

  useEffect(() => {
    if (data?.onboarding) setForm(toForm(data.onboarding));
  }, [data]);

  const isComplete =
    form.weight &&
    form.height &&
    form.age &&
    form.gender &&
    form.goal &&
    form.experienceLevel;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    save.mutate(
      {
        weight: +form.weight,
        height: +form.height,
        age: +form.age,
        gender: form.gender as Gender,
        goal: form.goal as Goal,
        experienceLevel: form.experienceLevel as ExperienceLevel,
      },
      { onSuccess: () => onSaved?.() },
    );
  };

  if (isLoading) return <p className={styles.status}>Loading...</p>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Weight (kg)</span>
        <input
          type="number"
          inputMode="decimal"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span>Height (cm)</span>
        <input
          type="number"
          inputMode="decimal"
          value={form.height}
          onChange={(e) => setForm({ ...form, height: e.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span>Age</span>
        <input
          type="number"
          inputMode="numeric"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />
      </label>

      <fieldset className={styles.choices}>
        <legend>Gender</legend>
        {GENDERS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={
              form.gender === g.value ? styles.choiceActive : styles.choice
            }
            onClick={() => setForm({ ...form, gender: g.value })}
          >
            {g.label}
          </button>
        ))}
      </fieldset>

      <fieldset className={styles.choices}>
        <legend>Goal</legend>
        {GOALS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={
              form.goal === g.value ? styles.choiceActive : styles.choice
            }
            onClick={() => setForm({ ...form, goal: g.value })}
          >
            {g.label}
          </button>
        ))}
      </fieldset>

      <fieldset className={styles.choices}>
        <legend>Experience level</legend>
        {EXPERIENCE_LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            className={
              form.experienceLevel === l.value
                ? styles.choiceActive
                : styles.choice
            }
            onClick={() => setForm({ ...form, experienceLevel: l.value })}
          >
            {l.label}
          </button>
        ))}
      </fieldset>

      <Button type="submit" disabled={!isComplete || save.isPending}>
        {save.isPending ? "Saving..." : "Save"}
      </Button>

      {save.isSuccess && <p className={styles.status}>Saved</p>}
      {save.isError && (
        <p className={styles.error}>
          {save.error instanceof Error ? save.error.message : "Save failed"}
        </p>
      )}
    </form>
  );
}
