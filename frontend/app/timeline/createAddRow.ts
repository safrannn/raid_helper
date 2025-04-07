import { produce } from "immer";
import createRow from "@/app/timeline/createRow";
import { Timeline } from "animation-timeline-js";
import { TimelineEditorState } from "@/app/timeline/states";

export default function createAddRow(timeline: Timeline) {
  return produce((state: TimelineEditorState) => {
    const newRow = createRow({ row_id: undefined, keyframes: undefined });
    const rows = state.timelineModel?.rows;
    if (rows) {
      state.timelineModel.rows = [newRow, ...rows];
    }
  });
}
