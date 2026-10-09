import type { CalendarNote } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface CalendarNoteInput {
  date: string; // YYYY-MM-DD
  note: string;
}

export class CalendarNoteModel {
  findByMonth(userEmail: string, year: number, month: number): Promise<CalendarNote[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    return prismaClient.calendarNote.findMany({
      where: {
        userEmail,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });
  }

  findByDate(userEmail: string, date: string): Promise<CalendarNote | null> {
    return prismaClient.calendarNote.findUnique({
      where: { userEmail_date: { userEmail, date } },
    });
  }

  upsert(userEmail: string, data: CalendarNoteInput): Promise<CalendarNote> {
    return prismaClient.calendarNote.upsert({
      where: { userEmail_date: { userEmail, date: data.date } },
      create: { userEmail, date: data.date, note: data.note },
      update: { note: data.note },
    });
  }

  delete(userEmail: string, date: string): Promise<CalendarNote> {
    return prismaClient.calendarNote.delete({
      where: { userEmail_date: { userEmail, date } },
    });
  }
}
