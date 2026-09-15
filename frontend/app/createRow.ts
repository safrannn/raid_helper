import {
  TimelineKeyframe,
  TimelineKeyframeShape,
  TimelineRanged,
  TimelineRow,
  TimelineSelectable,
} from "animation-timeline-js";
import { v7 } from "uuid";
import { ROW_SIZE } from "./useInitTimeline";

export interface TimelineKeyframeExtra
  extends TimelineKeyframe,
    TimelineSelectable,
    TimelineRanged {
  id?: string;
  visibility: boolean;
}

export interface TimelineRowExtra extends TimelineRow, TimelineRanged {
  keyframes?: TimelineKeyframeExtra[] | null;
  id?: string;
}

export const checkBossRowName = (
  bossName: String,
  difficulty: String,
  row: TimelineRowExtra
) => {
  if (row.id) {
    const expectedName = `boss__${bossName}__${difficulty}`;
    return row.id === expectedName;
  }
  return false;
};

export class TimelineModelExtra {
  rows: TimelineRowExtra[];
  constructor(rows: []) {
    this.rows = rows;
  }
}

interface CreateSingleKeyframeArgs {
  start?: number;
  keyframe_group_id?: string;
  visibility: boolean;
}

export const createSingleKeyframe = ({
  start = 500,
  keyframe_group_id = undefined,
  visibility = true,
}: CreateSingleKeyframeArgs) => {
  const keyframe: TimelineKeyframeExtra = {
    val: start,
    group: keyframe_group_id ?? `keyframe_${v7()}`,
    selected: false,
    draggable: true,
    visibility: visibility,
  };
  return keyframe;
};

interface CreateIntervalKeyframeArgs {
  start?: number;
  duration?: number;
  keyframe_group_id?: string;
  visibility: boolean;
}

export const createIntervalKeyframes = ({
  start = 500,
  duration = 0,
  keyframe_group_id = undefined,
  visibility = true,
}: CreateIntervalKeyframeArgs) => {
  return [
    {
      val: start - 500,
      group: keyframe_group_id ?? `keyframe_${v7()}`,
      selected: false,
      draggable: true,
      visibility: visibility,
    },
    {
      val: duration ? start + duration : start,
      group: keyframe_group_id ?? `keyframe_${v7()}`,
      selected: true,
      draggable: true,
      visibility: visibility,
      style: {
        height: 0,
        width: 0,
        shape: TimelineKeyframeShape.None,
      },
    },
  ];
};

interface CreateRowArgs {
  row_id?: string;
  keyframes: TimelineKeyframeExtra[] | undefined;
}

const createRow = ({
  row_id = undefined,
  keyframes = undefined,
}: CreateRowArgs) => {
  const row: TimelineRowExtra = {
    id: row_id ?? `row_${v7()}`,
    keyframes: keyframes ?? [],
  };
  return row;
};

export const createBossRow = (
  bossName: string,
  difficulty: string,
  keyframes: TimelineKeyframeExtra[] | undefined
) => {
  var newBossTimelineRowName = `boss__${bossName}__${difficulty}`;
  const row: TimelineRowExtra = {
    id: newBossTimelineRowName,
    keyframes: keyframes ?? [],
  };
  return row;
};

export const createPlayerRow = (
  playerName: string,
  playerId: number,
  playerClassName: string,
  playerSpecName: string,
  keyframes: TimelineKeyframeExtra[] | undefined
) => {
  const playerIdString = playerId.toString();
  const newPlayerTimelineRowName = `player__${playerName}__${playerIdString}__${playerClassName}__${playerSpecName}`;
  const row: TimelineRowExtra = {
    id: newPlayerTimelineRowName,
    keyframes: keyframes ?? [],
  };
  return row;
};

export default createRow;
