import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { AppProperties, buildQuery } from "../plugins/googleSheets.js";
import type { CreateProgramRequest, UpdateRowsRequest } from "../types.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { name, durationWeeks, dynamicRir, startingRir, workouts } =
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

  for (let week = 1; week <= durationWeeks; week++) {
    let weekRir = startingRir;
    if (dynamicRir && durationWeeks > 1) {
      const rirDecrement = startingRir / (durationWeeks - 1);
      weekRir = Math.max(
        0,
        Math.round(startingRir - rirDecrement * (week - 1)),
      );
    }

    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        const targetRir = dynamicRir ? weekRir : exercise.rir;
        const rirDisplay =
          targetRir === 0 ? "To Failure" : targetRir.toString();

        for (let set = 1; set <= exercise.sets; set++) {
          rows.push([
            "",
            week,
            workout.name,
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
    const { key, value } = AppProperties.program;
    await this.sheets.setFileProperties(tokens, spreadsheetId, {
      [key]: value,
    });
    await this.sheets.update(tokens, spreadsheetId, "Sheet1!A1", rows);

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
    const programs = files.map((file) => ({
      ...file,
      url: `https://docs.google.com/spreadsheets/d/${file.id}`,
    }));
    return { programs };
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
    const [data, programName] = await Promise.all([
      this.sheets.get(tokens, id, "Sheet1!A:K"),
      this.sheets.getFileName(tokens, id),
    ]);

    if (!data || data.length < 2) {
      return reply.status(404).send({ error: "Program not found or empty" });
    }

    const rows = data.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      date: String(row[0] || ""),
      week: Number(row[1]) || 0,
      workout: String(row[2] || ""),
      exercise: String(row[3] || ""),
      set: Number(row[4]) || 0,
      targetReps: Number(row[5]) || 0,
      rir: String(row[6] || ""),
      weight: String(row[7] || ""),
      repsAchieved: String(row[8] || ""),
      rirAchieved: String(row[9] || ""),
      notes: String(row[10] || ""),
    }));

    const weeks = new Map<number, Map<string, typeof rows>>();
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
        const completedDate = exercises[0]?.date || "";
        // Duration is stored in the second row's date column
        const secondRowDate = exercises[1]?.date || "";
        const duration = isDurationFormat(secondRowDate) ? secondRowDate : "";

        return {
          name,
          exercises,
          isComplete: exercises.every((e) => e.repsAchieved !== ""),
          completedDate,
          duration,
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
    const data = updates.map((update) => ({
      range: `Sheet1!H${update.rowIndex}:K${update.rowIndex}`,
      values: [
        [update.weight, update.repsAchieved, update.rirAchieved, update.notes],
      ],
    }));

    if (completedDate && dateRowIndex) {
      data.push({
        range: `Sheet1!A${dateRowIndex}`,
        values: [[completedDate]],
      });

      // Write duration one row below the date
      if (duration) {
        data.push({
          range: `Sheet1!A${dateRowIndex + 1}`,
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
