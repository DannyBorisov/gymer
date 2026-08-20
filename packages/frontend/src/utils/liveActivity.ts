import {
  LiveActivities,
  type LayoutElement,
  type DynamicIslandLayout,
} from "capacitor-live-activities";
import { Capacitor } from "@capacitor/core";

let currentActivityId: string | null = null;
let workoutStartTime: number = 0;
let restStartTime: number | null = null;

// Green color for workout, orange for rest
const WORKOUT_COLOR = "#22C55E";
const REST_COLOR = "#F97316";

// Create layout with native timer that auto-updates
const createLayout = (startTime: number): LayoutElement => ({
  type: "container",
  properties: [{ direction: "vertical" }, { spacing: 8 }, { padding: 16 }],
  children: [
    {
      type: "text",
      properties: [
        { text: "{{workoutName}}" },
        { fontSize: 14 },
        { color: "#A0A0A0" },
      ],
    },
    {
      type: "timer",
      properties: [
        { endTime: startTime },
        { style: "timer" },
        { fontSize: 32 },
        { fontWeight: "bold" },
        { color: "#FFFFFF" },
      ],
    },
  ],
});

// Create Dynamic Island layout with native timer
const createDynamicIslandLayout = (startTime: number): DynamicIslandLayout => ({
  expanded: {
    center: {
      type: "container",
      properties: [{ direction: "horizontal" }, { spacing: 12 }],
      children: [
        {
          type: "image",
          properties: [
            { systemName: "dumbbell.fill" },
            { color: WORKOUT_COLOR },
          ],
        },
        {
          type: "container",
          properties: [{ direction: "vertical" }, { spacing: 2 }],
          children: [
            {
              type: "text",
              properties: [
                { text: "{{workoutName}}" },
                { fontSize: 12 },
                { color: "#A0A0A0" },
              ],
            },
            {
              type: "timer",
              properties: [
                { endTime: startTime },
                { style: "timer" },
                { fontSize: 24 },
                { fontWeight: "bold" },
                { color: "#FFFFFF" },
                { monospacedDigit: true },
              ],
            },
          ],
        },
      ],
    },
  },
  compactLeading: {
    type: "container",
    properties: [{ direction: "horizontal" }, { spacing: 6 }],
    children: [
      {
        type: "image",
        properties: [{ systemName: "dumbbell.fill" }, { color: WORKOUT_COLOR }],
      },
      {
        type: "timer",
        properties: [
          { endTime: startTime },
          { style: "timer" },
          { fontSize: 14 },
          { fontWeight: "semibold" },
          { color: "#FFFFFF" },
          { monospacedDigit: true },
        ],
      },
    ],
  },
  compactTrailing: {
    type: "text",
    properties: [
      { text: "{{exerciseName}}" },
      { fontSize: 12 },
      { color: "#FFFFFF" },
      { lineLimit: 1 },
    ],
  },
  minimal: {
    type: "image",
    properties: [{ systemName: "dumbbell.fill" }, { color: WORKOUT_COLOR }],
  },
});

// Create layout with rest timer active
const createLayoutWithRest = (workoutStart: number, restStart: number): LayoutElement => ({
  type: "container",
  properties: [{ direction: "vertical" }, { spacing: 8 }, { padding: 16 }],
  children: [
    {
      type: "text",
      properties: [
        { text: "{{workoutName}}" },
        { fontSize: 14 },
        { color: "#A0A0A0" },
      ],
    },
    {
      type: "container",
      properties: [{ direction: "horizontal" }, { spacing: 16 }],
      children: [
        {
          type: "timer",
          properties: [
            { endTime: workoutStart },
            { style: "timer" },
            { fontSize: 24 },
            { fontWeight: "bold" },
            { color: "#FFFFFF" },
          ],
        },
        {
          type: "container",
          properties: [{ direction: "horizontal" }, { spacing: 4 }],
          children: [
            {
              type: "image",
              properties: [{ systemName: "timer" }, { color: REST_COLOR }],
            },
            {
              type: "timer",
              properties: [
                { endTime: restStart },
                { style: "timer" },
                { fontSize: 24 },
                { fontWeight: "bold" },
                { color: REST_COLOR },
              ],
            },
          ],
        },
      ],
    },
  ],
});

// Create Dynamic Island layout with rest timer
const createDynamicIslandLayoutWithRest = (workoutStart: number, restStart: number): DynamicIslandLayout => ({
  expanded: {
    center: {
      type: "container",
      properties: [{ direction: "horizontal" }, { spacing: 20 }],
      children: [
        {
          type: "container",
          properties: [{ direction: "horizontal" }, { spacing: 8 }],
          children: [
            {
              type: "image",
              properties: [
                { systemName: "dumbbell.fill" },
                { color: WORKOUT_COLOR },
              ],
            },
            {
              type: "timer",
              properties: [
                { endTime: workoutStart },
                { style: "timer" },
                { fontSize: 20 },
                { fontWeight: "bold" },
                { color: "#FFFFFF" },
                { monospacedDigit: true },
              ],
            },
          ],
        },
        {
          type: "container",
          properties: [{ direction: "horizontal" }, { spacing: 8 }],
          children: [
            {
              type: "image",
              properties: [
                { systemName: "timer" },
                { color: REST_COLOR },
              ],
            },
            {
              type: "timer",
              properties: [
                { endTime: restStart },
                { style: "timer" },
                { fontSize: 20 },
                { fontWeight: "bold" },
                { color: REST_COLOR },
                { monospacedDigit: true },
              ],
            },
          ],
        },
      ],
    },
  },
  compactLeading: {
    type: "container",
    properties: [{ direction: "horizontal" }, { spacing: 6 }],
    children: [
      {
        type: "image",
        properties: [{ systemName: "timer" }, { color: REST_COLOR }],
      },
      {
        type: "timer",
        properties: [
          { endTime: restStart },
          { style: "timer" },
          { fontSize: 14 },
          { fontWeight: "semibold" },
          { color: REST_COLOR },
          { monospacedDigit: true },
        ],
      },
    ],
  },
  compactTrailing: {
    type: "text",
    properties: [
      { text: "Rest" },
      { fontSize: 12 },
      { color: REST_COLOR },
    ],
  },
  minimal: {
    type: "image",
    properties: [{ systemName: "timer" }, { color: REST_COLOR }],
  },
});

export const startWorkoutLiveActivity = async (
  workoutName: string,
  exerciseName: string = "",
): Promise<void> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return;
  }

  try {
    workoutStartTime = Date.now();
    restStartTime = null;

    const result = await LiveActivities.startActivity({
      layout: createLayout(workoutStartTime),
      dynamicIslandLayout: createDynamicIslandLayout(workoutStartTime),
      behavior: {
        widgetUrl: "gymerr://workout",
      },
      data: {
        workoutName: workoutName,
        exerciseName: exerciseName,
      },
    });
    currentActivityId = result.activityId;
    console.log("Live Activity: Started with ID", currentActivityId);
  } catch (error) {
    console.error("Live Activity: Failed to start", error);
  }
};

export const updateRestTimer = async (
  isActive: boolean,
  workoutName: string,
  exerciseName: string = "",
): Promise<void> => {
  if (!currentActivityId || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // End current activity and start new one with updated layout
    await LiveActivities.endActivity({
      activityId: currentActivityId,
      data: { workoutName, exerciseName },
    });

    if (isActive) {
      restStartTime = Date.now();
      const result = await LiveActivities.startActivity({
        layout: createLayoutWithRest(workoutStartTime, restStartTime),
        dynamicIslandLayout: createDynamicIslandLayoutWithRest(workoutStartTime, restStartTime),
        behavior: {
          widgetUrl: "gymerr://workout",
        },
        data: {
          workoutName: workoutName,
          exerciseName: exerciseName,
        },
      });
      currentActivityId = result.activityId;
    } else {
      restStartTime = null;
      const result = await LiveActivities.startActivity({
        layout: createLayout(workoutStartTime),
        dynamicIslandLayout: createDynamicIslandLayout(workoutStartTime),
        behavior: {
          widgetUrl: "gymerr://workout",
        },
        data: {
          workoutName: workoutName,
          exerciseName: exerciseName,
        },
      });
      currentActivityId = result.activityId;
    }
  } catch (error) {
    console.error("Live Activity: Failed to update rest timer", error);
  }
};

export const updateExerciseName = async (
  exerciseName: string,
  workoutName: string,
): Promise<void> => {
  if (!currentActivityId || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LiveActivities.updateActivity({
      activityId: currentActivityId,
      data: {
        workoutName: workoutName,
        exerciseName: exerciseName,
      },
    });
  } catch (error) {
    console.error("Live Activity: Failed to update exercise name", error);
  }
};

export const endWorkoutLiveActivity = async (): Promise<void> => {
  if (!currentActivityId || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LiveActivities.endActivity({
      activityId: currentActivityId,
      data: {
        workoutName: "Workout Complete",
      },
    });
    currentActivityId = null;
    workoutStartTime = 0;
    restStartTime = null;
  } catch (error) {
    console.error("Failed to end Live Activity:", error);
  }
};

export const isLiveActivityActive = (): boolean => {
  return currentActivityId !== null;
};
