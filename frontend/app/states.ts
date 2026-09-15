import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { produce } from "immer";
import { TimelineModelExtra, TimelineRowExtra } from "@/app/createRow";
import createAddRow from "@/app/createAddRow";
import { BossMap, BossSpellMap, PlayerClassSpecIconMap } from "./types";
import { RowGroup, SpellItem } from "@/app/visTimeline/model";
import {
  Timeline,
  TimelineInteractionMode,
  TimelineModel,
} from "animation-timeline-js";

type TimelinePlayingState = "idle" | "loading" | "playing";

export interface TimelineState {
  timelinePlayingState: TimelinePlayingState;
  setTimelinePlayingState: (timelinePlayingState: TimelinePlayingState) => void;

  timelineCoarseTime: number;
  setTimelineCoarseTime: (timelineCoarseTime: number) => void;

  timelineInteractionMode: TimelineInteractionMode;
  setTimelineInteractionMode: (
    timelineInteractionMode: TimelineInteractionMode
  ) => void;
}

const createTimelineState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  TimelineState
> = (set) => ({
  timelineCoarseTime: 0,
  setTimelineCoarseTime: (timelineCoarseTime: number) =>
    set({ timelineCoarseTime }),

  timelineInteractionMode: TimelineInteractionMode.Pan,
  setTimelineInteractionMode: (
    timelineInteractionMode: TimelineInteractionMode
  ) => set({ timelineInteractionMode }),

  timelinePlayingState: "idle",
  setTimelinePlayingState: (timelinePlayingState: TimelinePlayingState) =>
    set({ timelinePlayingState }),
});

export interface TimelineEditorState {
  timelineModel: TimelineModelExtra;
  setTimelineModel: (newMode: TimelineModelExtra) => void;

  addTimelineRow: (timeline: Timeline) => void;
  pushTimelineRow: (row: TimelineRowExtra) => void;
  deleteTimelineRow: (indexToDelete: number) => void;

  isTimelinePlayable: boolean;
}

export const initialModel: TimelineModelExtra = {
  rows: [],
};

const createTimelineEditorState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  TimelineEditorState
> = (set) => ({
  timelineKeyframeEnd: 0,
  timelineKeyframeStart: 1000,

  timelineModel: initialModel,
  setTimelineModel: (timelineModel: TimelineModelExtra) =>
    set({ timelineModel }),
  // setTimelineModelRows: (rows: TimelineRowExtra[]) => {
  //   const newTimelineModel = timelineModel
  // }

  addTimelineRow: (timeline: Timeline) => set(createAddRow(timeline)),
  pushTimelineRow: (row: TimelineRowExtra) =>
    set(
      produce((state: TimelineEditorState) => {
        state.timelineModel.rows.push(row);
      })
    ),
  deleteTimelineRow: (indexToDelete: number) =>
    set(
      produce((state: TimelineEditorState) => {
        state.timelineModel.rows.splice(indexToDelete, 1);
      })
    ),

  isTimelinePlayable: false,
});

export interface TimelineEditorState {
  timelineModel: TimelineModelExtra;
  setTimelineModel: (newModel: TimelineModelExtra) => void;

  addTimelineRow: (timeline: Timeline) => void;
  pushTimelineRow: (row: TimelineRowExtra) => void;
  deleteTimelineRow: (indexToDelete: number) => void;

  isTimelinePlayable: boolean;
}

// Model for the vis-timeline based component (app/visTimeline). Plain arrays
// in the store; the hook mirrors them into vis DataSets.
export interface VisTimelineState {
  visGroups: RowGroup[];
  visItems: SpellItem[];
  setVisModel: (groups: RowGroup[], items: SpellItem[]) => void;
  pushVisGroup: (group: RowGroup) => void;
  // Written back when the user drags an item on the timeline.
  moveVisItem: (id: string, start: number, end?: number) => void;

  hiddenBossSpellIds: number[];
  setHiddenBossSpellIds: (ids: number[]) => void;
  setBossSpellHidden: (spellId: number, hidden: boolean) => void;
}

const createVisTimelineState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  VisTimelineState
> = (set) => ({
  visGroups: [],
  visItems: [],
  setVisModel: (visGroups, visItems) => set({ visGroups, visItems }),
  pushVisGroup: (group) =>
    set((state) => ({ visGroups: [...state.visGroups, group] })),
  moveVisItem: (id, start, end) =>
    set((state) => {
      const idx = state.visItems.findIndex((i) => i.id === id);
      if (idx < 0) return {};
      const cur = state.visItems[idx];
      if (cur.start === start && cur.end === end) return {};
      const visItems = state.visItems.slice();
      visItems[idx] = { ...cur, start, end };
      return { visItems };
    }),

  hiddenBossSpellIds: [],
  setHiddenBossSpellIds: (hiddenBossSpellIds) => set({ hiddenBossSpellIds }),
  setBossSpellHidden: (spellId, hidden) =>
    set((state) => {
      const has = state.hiddenBossSpellIds.includes(spellId);
      if (has === hidden) return {};
      return {
        hiddenBossSpellIds: hidden
          ? [...state.hiddenBossSpellIds, spellId]
          : state.hiddenBossSpellIds.filter((id) => id !== spellId),
      };
    }),
});

export interface GlobalState {
  bossName: string;
  setBossName: (bossName: string) => void;

  difficulty: string;
  setDifficulty: (difficulty: string) => void;

  allowLoadFight: boolean;
  setAllowLoadFight: (isLoaded: boolean) => void;

  bossMap: BossMap;
  setBossMap: (bossMap: BossMap) => void;

  bossSpellMap: BossSpellMap;
  setBossSpellMap: (bossSpellMap: BossSpellMap) => void;

  classSpecIconMap: PlayerClassSpecIconMap;
  setClassSpecIconMap: (classSpecIconMap: PlayerClassSpecIconMap) => void;
}

const createGlobalState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  GlobalState
> = (set) => ({
  bossName: "",
  setBossName: (bossName: string) => set({ bossName }),

  difficulty: "",
  setDifficulty: (difficulty: string) => set({ difficulty }),

  allowLoadFight: false,
  setAllowLoadFight: (allowLoadFight: boolean) => set({ allowLoadFight }),

  bossMap: new Map(),
  setBossMap: (bossMap: BossMap) => set({ bossMap }),

  bossSpellMap: new Map(),
  setBossSpellMap: (bossSpellMap: BossSpellMap) => set({ bossSpellMap }),

  classSpecIconMap: new Map(),
  setClassSpecIconMap: (classSpecIconMap: PlayerClassSpecIconMap) =>
    set({ classSpecIconMap }),
});

export type StateIntersection = TimelineState &
  TimelineEditorState &
  VisTimelineState &
  GlobalState;

const useEditorStore = create<StateIntersection>()(
  devtools((...a) => ({
    ...createTimelineState(...a),
    ...createTimelineEditorState(...a),
    ...createVisTimelineState(...a),
    ...createGlobalState(...a),
  }))
);

export default useEditorStore;
