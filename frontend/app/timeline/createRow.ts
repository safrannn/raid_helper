import { TimelineSelectable, TimelineKeyframe, Timeline, TimelineRow, TimelineRanged, TimelineKeyframeShape, TimelineKeyframeStyle } from "animation-timeline-js";
import { v7 } from "uuid";

const ICON_SIZE = 22;
const ROW_SIZE = 30;

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

export interface TimelineModelExtra {
    rows: TimelineRowExtra[];
}

interface CreateSingleKeyframeArgs{
  start?: number,
  keyframe_group_id?: string,
}

export const createSingleKeyframe = ({
    start = 7000,
    keyframe_group_id = undefined 
  }: CreateSingleKeyframeArgs) => {
  return {
    val: start,
    group: keyframe_group_id ?? `keyframe_${v7()}`,
    style: {
      height: ICON_SIZE,
      width: ICON_SIZE,
      shape: TimelineKeyframeShape.Rect,
      fillColor: "#006FEE", // blue
      selectedFillColor: "#17c964", // green
    },
    selected: false,
    draggable: false,
  };
}

interface CreateIntervalKeyframeArgs{
  start?: number,
  duration?: number,
  keyframe_group_id?: string,
}

export const createIntervalKeyframes = ({
    start = 7000,
    duration = 0,
    keyframe_group_id = undefined,
  }: CreateIntervalKeyframeArgs) => {
  return [{
    val: start,
    group: keyframe_group_id ?? `keyframe_${v7()}`,
    style: {
      height: ICON_SIZE,
      width: ICON_SIZE,
      shape: TimelineKeyframeShape.Rect,
      fillColor: "#006FEE", // blue
      selectedFillColor: "#17c964", // green
    },
    selected: false,
    draggable: false,
  },
  {
    val: duration? start + duration : start,
    group: keyframe_group_id ?? `keyframe_${v7()}`,
    style: {
      height: 0,
      width: 0,
      shape: TimelineKeyframeShape.None,
    },
    selected: false,
    draggable: false,
  }]
}


interface CreateRowArgs {
  row_id?: string;
  keyframes: TimelineKeyframeExtra[] | undefined;
}


const createRow = ({
  row_id = undefined,
  keyframes = undefined
}: CreateRowArgs) => {
  const row: TimelineRowExtra = {
    id: row_id ?? `row_${v7()}`,
    style: {
      height: ROW_SIZE,
      marginBottom: 5,
    },
    keyframes: keyframes ?? [],
  };
  return row;
};
  
export default createRow;