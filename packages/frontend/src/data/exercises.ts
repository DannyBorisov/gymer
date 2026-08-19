// Preset exercise names organized by muscle group
export const exercisesByCategory: Record<string, string[]> = {
  Chest: [
    "Bench Press",
    "Barbell Bench Press",
    "Incline Bench Press",
    "Incline Dumbbell Press",
    "Dumbbell Bench Press",
    "Cable Fly",
    "Dumbbell Fly",
    "Push-ups",
    "Dips",
  ],
  Back: [
    "Barbell Row",
    "Cable Row",
    "Dumbbell Row",
    "Lat Pulldown",
    "Weighted Pull-ups",
    "Pull-ups",
    "Chin-ups",
    "T-Bar Row",
    "Seated Cable Row",
    "Face Pull",
  ],
  Shoulders: [
    "Overhead Press",
    "Dumbbell Shoulder Press",
    "Dumbbell Lateral Raise",
    "Front Raise",
    "Rear Delt Fly",
    "Arnold Press",
    "Upright Row",
  ],
  Legs: [
    "Barbell Squat",
    "Front Squat",
    "Leg Press",
    "Leg Extension",
    "Leg Curl",
    "Romanian Deadlift",
    "Bulgarian Split Squat",
    "Lunges",
    "Hip Thrust",
    "Glute Bridge",
  ],
  Arms: [
    "Barbell Curl",
    "Dumbbell Curl",
    "Hammer Curl",
    "Preacher Curl",
    "Tricep Pushdown",
    "Skull Crushers",
    "Overhead Tricep Extension",
    "Close-Grip Bench Press",
    "Cable Curl",
  ],
  Calves: [
    "Standing Calf Raise",
    "Seated Calf Raise",
    "Calf Raise",
  ],
  Core: [
    "Deadlift",
    "Plank",
    "Ab Rollout",
    "Hanging Leg Raise",
    "Cable Crunch",
    "Russian Twist",
  ],
};

// Flat list of all exercises
export const allExercises: string[] = Object.values(exercisesByCategory).flat();

// Get unique exercises sorted alphabetically
export const uniqueExercises: string[] = [...new Set(allExercises)].sort();
