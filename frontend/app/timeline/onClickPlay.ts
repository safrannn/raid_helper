import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { Timeline } from "animation-timeline-js";
import useEditorStore from "@/app/timeline/states";

const playDelay = 5;
const playStep = 100;
const SAMPLE_TIME_IN_MS = 50;
const timelineKeyframeEndDefault = 900000;

interface UseOnPlayClickArgs{
  timeline: Timeline | undefined;
  timelineElRef: React.RefObject<HTMLDivElement>;
}

export default function useOnClickPlay ({
  timeline,
  timelineElRef,
}: UseOnPlayClickArgs) {
  const {    
    timelinePlayingState,
    setTimelinePlayingState,
    setTimelineCoarseTime,
  } = useEditorStore(
    useShallow((state) => ({
      timelinePlayingState: state.timelinePlayingState,
      setTimelinePlayingState: state.setTimelinePlayingState,
      setTimelineCoarseTime: state.setTimelineCoarseTime,
    })),
  );

  const max = timelineKeyframeEndDefault;
  const isTimelinePlaying = timelinePlayingState === "playing";

  const moveTimelineIntoTheBounds = useCallback(() => {
    if (timeline) {
      // If user is manipulating items, don't move screen in this case.
      if (
        timeline._startPosMouseArgs ||
        timeline._scrollAreaClickOrDragStarted
      ) {
        return;
      }

      const fromPx = timeline.scrollLeft;
      const toPx = timeline.scrollLeft + timeline.getClientWidth();
      const positionInPixels =
        timeline.valToPx(timeline.getTime()) + timeline._leftMargin();
      // Scroll to timeline position if timeline is out of the bounds:
      if (positionInPixels <= fromPx || positionInPixels >= toPx) {
        timeline.scrollLeft = positionInPixels;
      }
    }
  }, [timeline]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    // On component init
    if (timelineElRef.current) {
      intervalId = setInterval(() => {
        if (isTimelinePlaying && timeline) {
          let newTime = timeline.getTime() + playStep;
          if (newTime - 1 > max) {
            newTime = 0;
          }
          timeline.setTime(newTime);
          moveTimelineIntoTheBounds();
          if (newTime % SAMPLE_TIME_IN_MS === 0) {
            setTimelineCoarseTime(newTime);
          }
        }
      }, playDelay);
    }

    // cleanup on component unmounted.
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    isTimelinePlaying,
    max,
    moveTimelineIntoTheBounds,
    setTimelineCoarseTime,
    timeline,
    timelineElRef,
  ]);

  const onClickPlay = useCallback(
    () => {
      setTimelinePlayingState("playing");
      if (timeline) {
        moveTimelineIntoTheBounds();
        timeline.setOptions({ timelineDraggable: false });
      }
    },
    [moveTimelineIntoTheBounds, setTimelinePlayingState, timeline],
  );

  return { onClickPlay };
};
