import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { AppProperties, buildQuery } from "../plugins/googleSheets.js";
import type { CreateProgramRequest, UpdateRowsRequest } from "../types.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { name, durationWeeks, dynamicRir, startingRir, workouts, frequency } =
    request.body;

  const headers = [
    "Date",
    "Week",
    "Workout",
    "Exercise",
    "Set",
    "Target Reps",
    "RIR",
    "Weight",
    "Reps Achieved",
    "RIR Achieved",
    "Notes",
  ];
  const rows: (string | number)[][] = [headers];

  // Determine how many workout sessions per week
  const sessionsPerWeek = frequency === "every-other-day" ? 4 : frequency;

  for (let week = 1; week <= durationWeeks; week++) {
    let weekRir = startingRir;
    if (dynamicRir && durationWeeks > 1) {
      const rirDecrement = startingRir / (durationWeeks - 1);
      weekRir = Math.max(
        0,
        Math.round(startingRir - rirDecrement * (week - 1)),
      );
    }

    // Cycle through workouts to fill the required sessions per week
    for (let session = 0; session < sessionsPerWeek; session++) {
      const workout = workouts[session % workouts.length];
      // Add session number suffix if cycling through same workout multiple times
      const workoutName =
        workouts.length < sessionsPerWeek
          ? `${workout.name} #${session + 1}`
          : workout.name;

      for (const exercise of workout.exercises) {
        // Use exercise's custom RIR if set, otherwise use dynamic/manual RIR
        const targetRir =
          dynamicRir && !exercise.customRir ? weekRir : exercise.rir;
        const rirDisplay =
          targetRir === 0 ? "To Failure" : targetRir.toString();

        for (let set = 1; set <= exercise.sets; set++) {
          rows.push([
            "",
            week,
            workoutName,
            exercise.name,
            set,
            exercise.reps,
            rirDisplay,
            "",
            "",
            "",
            "",
          ]);
        }
      }
    }
  }

  try {
    const spreadsheetId = await this.sheets.create(tokens, name);
    const [, { sheetName }] = await Promise.all([
      this.sheets.setFileProperties(tokens, spreadsheetId, {
        [AppProperties.program.key]: AppProperties.program.value,
      }),
      this.sheets.getSpreadsheetMetadata(tokens, spreadsheetId),
    ]);
    await this.sheets.update(tokens, spreadsheetId, `${sheetName}!A1`, rows);

    return {
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to create spreadsheet" });
  }
};

export const listPrograms: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const files = await this.sheets.listFiles(tokens, buildQuery("program"));
    return { programs: files };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch programs" });
  }
};

export const getProgram: RouteHandler<{
  Params: { id: string };
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const [{ sheetName }, programName] = await Promise.all([
      this.sheets.getSpreadsheetMetadata(tokens, id),
      this.sheets.getFileName(tokens, id),
    ]);
    const data = await this.sheets.get(tokens, id, `${sheetName}!A:K`);

    if (!data || data.length < 2) {
      return reply.status(404).send({ error: "Program not found or empty" });
    }

    const rows = data.slice(1).map((row, index) => {
      const [
        date,
        week,
        workout,
        exercise,
        set,
        targetReps,
        rir,
        weight,
        repsAchieved,
        rirAchieved,
        notes,
      ] = row;
      return {
        rowIndex: index + 2,
        date: date || "",
        week: Number(week) || 0,
        workout: workout || "",
        exercise: exercise || "",
        set: Number(set) || 0,
        targetReps: Number(targetReps) || 0,
        rir: rir || "",
        weight: weight || "",
        repsAchieved: repsAchieved || "",
        rirAchieved: rirAchieved || "",
        notes: notes || "",
      };
    });

    const weeks = new Map<number | string, Map<string | number, typeof rows>>();
    for (const row of rows) {
      if (!weeks.has(row.week)) {
        weeks.set(row.week, new Map());
      }
      const workouts = weeks.get(row.week)!;
      if (!workouts.has(row.workout)) {
        workouts.set(row.workout, []);
      }
      workouts.get(row.workout)!.push(row);
    }

    // Helper to detect duration format (H:MM:SS or HH:MM:SS)
    const isDurationFormat = (str: string) => /^\d{1,2}:\d{2}:\d{2}$/.test(str);

    const program = Array.from(weeks.entries()).map(([weekNum, workouts]) => ({
      week: weekNum,
      workouts: Array.from(workouts.entries()).map(([name, exercises]) => {
        const [{ date: date }, { date: duration }] = exercises;
        const isComplete = exercises.every(
          (e) => e.repsAchieved !== "" && e.weight !== "",
        );

        return {
          name,
          exercises,
          isComplete,
          completedDate: date,
          duration: isDurationFormat("" + duration)
            ? String(duration)
            : undefined,
        };
      }),
    }));

    return { program, name: programName };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch program" });
  }
};

export const updateProgramRows: RouteHandler<{
  Params: { id: string };
  Body: UpdateRowsRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;
  const { updates, completedDate, dateRowIndex, duration } = request.body;

  try {
    const { sheetName } = await this.sheets.getSpreadsheetMetadata(tokens, id);

    const data = updates.map((update) => ({
      range: `${sheetName}!H${update.rowIndex}:K${update.rowIndex}`,
      values: [
        [update.weight, update.repsAchieved, update.rirAchieved, update.notes],
      ],
    }));

    if (completedDate && dateRowIndex) {
      data.push({
        range: `${sheetName}!A${dateRowIndex}`,
        values: [[completedDate]],
      });

      // Write duration one row below the date
      if (duration) {
        data.push({
          range: `${sheetName}!A${dateRowIndex + 1}`,
          values: [[duration]],
        });
      }
    }

    await this.sheets.batchUpdate(tokens, id, data);
    return { success: true };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to update program" });
  }
};
