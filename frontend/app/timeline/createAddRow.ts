import { produce } from "immer";
import createRow  from "@/app/timeline/createRow";
import { Timeline } from "animation-timeline-js";
import { TimelineEditorState } from "@/app/timeline/states";

export default function createAddRow(timeline: Timeline) {
  return produce((state: TimelineEditorState) => {
    const newRow = createRow({ start: timeline.getTime() });
    const rows = state.timelineModel?.rows;
    if (rows) {
      state.timelineModel.rows = [newRow, ...rows];
    }
  });
}
