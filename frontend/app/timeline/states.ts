import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { produce } from "immer";
import { TimelineModelExtra } from "@/app/timeline/createRow";
import createAddRow from "@/app/timeline/createAddRow";
import { BossMap, BossSpellMap, PlayerClassSpecIconMap } from "../types";
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
  deleteTimelineRow: (indexToDelete: number) => void;

  isTimelinePlayable: boolean;
}

const initialModel: TimelineModelExtra = {
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
  setTimelineModel: (timelineModel: TimelineModel) => set({ timelineModel }),

  addTimelineRow: (timeline: Timeline) => set(createAddRow(timeline)),
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
  deleteTimelineRow: (indexToDelete: number) => void;

  isTimelinePlayable: boolean;
}

export interface FightState {
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

const createFightState: StateCreator<
  StateIntersection,
  [["zustand/devtools", never]],
  [],
  FightState
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
  FightState;

const useEditorStore = create<StateIntersection>()(
  devtools((...a) => ({
    ...createTimelineState(...a),
    ...createTimelineEditorState(...a),
    ...createFightState(...a),
  }))
);

export default useEditorStore;
