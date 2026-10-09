import assert from "node:assert/strict";
import test from "node:test";
import { deadlineState, educatorReport, type CourseUpload } from "./course_delivery.js";

const assignment: CourseUpload = {
  requestId: "req_biology_201",
  courseId: "biology-201",
  lessonId: "cell-structure",
  educatorId: "educator-42",
  learnerIds: ["learner-7", "learner-9", "learner-11"],
  deadline: "2026-10-01T16:00:00.000Z",
  filename: "cells.jpg",
  imageBase64: "a-valid-length-placeholder"
};

test("marks a course due soon and reports every assigned learner", () => {
  const state = deadlineState(assignment.deadline, new Date("2026-09-30T16:00:00.000Z"));
  const report = educatorReport(assignment, state);

  assert.equal(state, "due_soon");
  assert.deepEqual(report, {
    educatorId: "educator-42",
    courseId: "biology-201",
    lessonId: "cell-structure",
    assignedLearners: 3,
    deadline: "2026-10-01T16:00:00.000Z",
    deadlineState: "due_soon"
  });
});

test("closes delivery at the deadline instant", () => {
  assert.equal(deadlineState(assignment.deadline, new Date(assignment.deadline)), "closed");
});
