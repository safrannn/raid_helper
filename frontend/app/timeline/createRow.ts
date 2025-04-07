import {
  TimelineKeyframe,
  TimelineKeyframeShape,
  TimelineRanged,
  TimelineRow,
  TimelineSelectable,
} from "animation-timeline-js";
import { ROW_SIZE } from "./useInitTimeline";
import { v7 } from "uuid";

export interface TimelineKeyframeExtra
  extends TimelineKeyframe,
    TimelineSelectable,
    TimelineRanged {
  id?: string;
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

export interface TimelineModelExtra {
  rows: TimelineRowExtra[];
}

interface CreateSingleKeyframeArgs {
  start?: number;
  keyframe_group_id?: string;
}

export const createSingleKeyframe = ({
  start = 500,
  keyframe_group_id = undefined,
}: CreateSingleKeyframeArgs) => {
  return {
    val: start,
    group: keyframe_group_id ?? `keyframe_${v7()}`,
    style: {
      height: ROW_SIZE,
      width: ROW_SIZE,
      shape: TimelineKeyframeShape.Rect,
      fillColor: "#006FEE", // blue
      selectedFillColor: "#17c964", // green
    },
    selected: false,
    draggable: false,
  };
};

interface CreateIntervalKeyframeArgs {
  start?: number;
  duration?: number;
  keyframe_group_id?: string;
}

export const createIntervalKeyframes = ({
  start = 500,
  duration = 0,
  keyframe_group_id = undefined,
}: CreateIntervalKeyframeArgs) => {
  return [
    {
      val: start - 500,
      group: keyframe_group_id ?? `keyframe_${v7()}`,
      style: {
        height: ROW_SIZE,
        width: ROW_SIZE,
        shape: TimelineKeyframeShape.Rect,
        fillColor: "#006FEE", // blue
        selectedFillColor: "#17c964", // green
      },
      selected: false,
      draggable: false,
    },
    {
      val: duration ? start + duration : start,
      group: keyframe_group_id ?? `keyframe_${v7()}`,
      style: {
        height: 0,
        width: 0,
        shape: TimelineKeyframeShape.None,
      },
      selected: false,
      draggable: false,
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

export default createRow;
