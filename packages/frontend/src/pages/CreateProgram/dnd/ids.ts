/**
 * @dnd-kit id helpers for the Create Program exercise grid.
 *
 * Sortable items use the exercise's own stable `id`. Each session also exposes
 * a droppable container id so an exercise can be dropped into an empty session.
 */

const CONTAINER_ID = /^w(\d+)-container$/;

export const containerId = (workoutIndex: number): string =>
  `w${workoutIndex}-container`;

export const parseContainerId = (id: string): number | null => {
  const match = CONTAINER_ID.exec(id);
  return match ? +match[1] : null;
};

export const isContainerId = (id: string): boolean => CONTAINER_ID.test(id);
