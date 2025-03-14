import { TimelineSelectable, TimelineKeyframe, Timeline, TimelineRow, TimelineRanged, TimelineModel, TimelineInteractionMode } from "animation-timeline-js";
// import { TimelineInteractionMode } from "animation-timeline-js/lib/enums/timelineInteractionMode";
import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { produce } from "immer";
import createRow, { createSingleKeyframe, TimelineModelExtra } from "@/app/timeline/createRow";
import createAddRow from "@/app/timeline/createAddRow";

type TimelinePlayingState = "idle" | "loading" | "playing";

interface TimelineState{
  timelinePlayingState: TimelinePlayingState;
  setTimelinePlayingState: (timelinePlayingState: TimelinePlayingState) => void;

  timelineCoarseTime: number;
  setTimelineCoarseTime: (timelineCoarseTime: number) => void;

  timelineInteractionMode: TimelineInteractionMode;
  setTimelineInteractionMode: (
  timelineInteractionMode: TimelineInteractionMode,
  ) => void;
}

const createTimelineState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  TimelineState
>  = (set) => ({
  timelineCoarseTime: 0,
  setTimelineCoarseTime: (timelineCoarseTime: number) => set({ timelineCoarseTime }),

  timelineInteractionMode: TimelineInteractionMode.Pan,
  setTimelineInteractionMode: (timelineInteractionMode: TimelineInteractionMode) =>
    set({ timelineInteractionMode }),

  timelinePlayingState: "idle",
  setTimelinePlayingState: (timelinePlayingState: TimelinePlayingState) =>
    set({ timelinePlayingState }),
});


export interface TimelineEditorState{
  timelineModel: TimelineModelExtra;
  setTimelineModel: (newMode: TimelineModelExtra) => void;

  addTimelineRow: (timeline: Timeline) => void;
  deleteTimelineRow: (indexToDelete: number) => void;

  isTimelinePlayable: boolean;
}

const initialModel: TimelineModelExtra = {
  rows: [],
};

const createTimelineEditorState : StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  TimelineEditorState
> = ((set) => ({
  timelineKeyframeEnd: 0,
  timelineKeyframeStart: 1000,

  timelineModel: initialModel,
  setTimelineModel: (timelineModel:TimelineModel) => set({ timelineModel }),

  addTimelineRow: (timeline: Timeline) => set(createAddRow(timeline)),
  deleteTimelineRow: (indexToDelete: number) =>
    set(
      produce((state: TimelineEditorState) => {
        state.timelineModel.rows.splice(indexToDelete, 1);
      }),
    ),

  isTimelinePlayable: false,
}));


export type StateIntersection = TimelineState & TimelineEditorState;

const useEditorStore = create<StateIntersection>()(
  devtools((...a) => ({
    ...createTimelineState(...a),
    ...createTimelineEditorState(...a),
  })),
);

export default useEditorStore;
