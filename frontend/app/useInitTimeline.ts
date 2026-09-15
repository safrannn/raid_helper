import { useEffect, useState } from "react";
import {
  Timeline,
  TimelineCapShape,
  TimelineInteractionMode,
  TimelineKeyframe,
  TimelineKeyframeShape,
  TimelineKeyframeViewModel,
  TimelineSelectedEvent,
  TimelineSelectionMode,
} from "animation-timeline-js";
import useEditorStore from "./states";
import { BossSpell } from "./types";
import { useTheme } from "next-themes";

export const ROW_SIZE = 40;

// Timeline scale settings (values are in ms).
const STEP_PX = 100;
const STEP_VAL = 5000;
const LEFT_MARGIN = 25;
// Range of the timeline that should be visible on load.
const INITIAL_VISIBLE_MS = 60_000;

// Compute the zoom level at which `visibleMs` exactly fills the canvas width.
// The library maps values to pixels as px = val * stepPx / (stepVal * zoom).
const zoomForVisibleRange = (timeline: Timeline, visibleMs: number) => {
  const canvasWidth = timeline.getClientWidth() - LEFT_MARGIN;
  if (canvasWidth <= 0) {
    return null;
  }
  return (visibleMs * STEP_PX) / (STEP_VAL * canvasWidth);
};

interface UseInitTimelineArgs {
  timelineElRef: React.RefObject<HTMLDivElement>;
}

export const useInitTimeline = ({ timelineElRef }: UseInitTimelineArgs) => {
  const [timeline, setTimeline] = useState<Timeline>();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let newTimeline: Timeline | null = null;
    // On component init
    if (timelineElRef.current) {
      newTimeline = new Timeline({
        id: timelineElRef.current,
        stepPx: STEP_PX,
        stepVal: STEP_VAL,
        leftMargin: LEFT_MARGIN,
        zoom: 6,
        zoomMin: 0.05,
        zoomSpeed: 0.05,
        snapEnabled: true,
        snapAllKeyframesOnMove: true,
        snapStep: 2500,
        font: "13px sans-serif",
        // selectionColor: "#f31260",
        // fillColor: "#18181b",
        timelineStyle: {
          width: 0.8,
          // marginTop: 15,
          // marginBottom: 200,
          // strokeColor: "#b2b2be",
          capStyle: {
            height: 15,
            // fillColor: "#b2b2be",
            // capType: TimelineCapShape.Triangle,
          },
        },
        rowsStyle: {
          height: ROW_SIZE - 1.5,
          marginBottom: 1.5,
          groupsStyle: {
            height: ROW_SIZE - 14,
            marginTop: "auto",
          },
          keyframesStyle: {
            height: ROW_SIZE,
            width: ROW_SIZE,
          },
        },
      });
      // Subscribe on timeline component events
      if (newTimeline) {
        // Fit the initial view to 0..INITIAL_VISIBLE_MS.
        const initialZoom = zoomForVisibleRange(newTimeline, INITIAL_VISIBLE_MS);
        if (initialZoom !== null) {
          newTimeline.setZoom(initialZoom);
          newTimeline.scrollLeft = 0;
        }
        // set renderer
        const defaultKeyframesRenderer =
          newTimeline?._renderKeyframe.bind(newTimeline);
        newTimeline._renderKeyframe = (ctx, keyframeViewModel) => {
          if (
            typeof keyframeViewModel.model.group === "string" &&
            keyframeViewModel.model.group.length > 1
          ) {
            var [groupId, spellId, imageUrl] =
              keyframeViewModel.model.group.split("__", 3);
            const image = new Image();
            // draw image
            image.src = imageUrl;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(
              image,
              keyframeViewModel.size.x,
              keyframeViewModel.size.y -
                (keyframeViewModel.size.width - 12) / 2,
              keyframeViewModel.size.width - 12,
              keyframeViewModel.size.height - 12
            );
            // draw border
            const keyframeBorderColor = keyframeViewModel.model.selected
              ? "#00FF00"
              : "black";
            ctx.lineWidth = 0.7;
            ctx.strokeStyle = keyframeBorderColor;
            ctx.strokeRect(
              keyframeViewModel.size.x,
              keyframeViewModel.size.y -
                (keyframeViewModel.size.width - 12) / 2,
              keyframeViewModel.size.width - 12,
              keyframeViewModel.size.height - 12
            );
          } else {
            defaultKeyframesRenderer(ctx, keyframeViewModel);
          }
        };
      }
      setTimeline(newTimeline);
    }

    // cleanup on component unmounted.
    return () => {
      newTimeline?.dispose();
    };
  }, [timelineElRef]);

  return { timeline };
};

const logMessage = (...args: Array<unknown>) => {
  console.log("TIMELINE LOG", ...args);
};

interface UseInitTimelineListenersType {
  timeline: Timeline | undefined;
  outlineContainerRef: React.RefObject<HTMLDivElement>;
  outlineScrollContainerRef: React.RefObject<HTMLDivElement>;
}

export const useInitTimelineListeners = ({
  timeline,
  outlineContainerRef,
  outlineScrollContainerRef,
}: UseInitTimelineListenersType) => {
  const [selectedKeyframes, setSelectedKeyframes] =
    useState<TimelineKeyframe[]>();

  useEffect(() => {
    if (timeline) {
      console.log("-------USE EFFECT CALLED");
      timeline.offAll();

      timeline.onSelected(function (obj) {
        logMessage(
          "Selected Event: (" +
            obj.selected.length +
            "). changed selection :" +
            obj.changed.length
        );
        // const selectedKeyframes = obj.selected;
        // for (var selectedKeyframe of selectedKeyframes) {
        //   selectedKeyframe.selected = true;
        // }
      });

      timeline.onMouseDown(function (obj) {
        logMessage("Mousedown.");
        const type = obj.target ? obj.target.type : "";
        if (obj.pos) {
          if (obj?.target?.keyframe) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const unknownGroup = obj.target.keyframe.group as any;
            const selectedKeyframe = obj?.target?.keyframe;
            selectedKeyframe.selected = true;
          }
          logMessage(
            "Mousedown:" +
              obj.val +
              ".  target:" +
              type +
              ". " +
              Math.floor(obj.pos.x) +
              "x" +
              Math.floor(obj.pos.y)
          );
          console.log({ targ: obj.target });
        }
      });

      timeline.onDoubleClick(function (obj) {
        const type = obj.target ? obj.target.type : "";
        if (obj.pos) {
          logMessage(
            "Doubleclick:" +
              obj.val +
              ".  target:" +
              type +
              ". " +
              Math.floor(obj.pos.x) +
              "x" +
              Math.floor(obj.pos.y)
          );
        }
        if (obj?.target?.keyframe) {
          const keyframe = obj?.target?.keyframe;
          keyframe.selected = true;
          console.log("Doubleclick", { keyframe });
          const keyframeGroup = keyframe.group?.toString()!;
          const [groupId, spellId, imageUrl] = keyframeGroup.split("__", 3);

          var selectingKeyframes = [];
          // for (var keyframe_ of timeline.getAllKeyframes()) {
          //   const keyframeGroup_ = keyframe_.group?.toString()!;
          //   const [groupId_, spellId_, imageUrl_] = keyframeGroup_.split(
          //     "__",
          //     3
          //   );
          //   if (spellId_ === spellId) {
          //     selectingKeyframes.push(keyframe_);
          //   }
          // }
          // console.log("Doubleclick", { selectingKeyframes });
          // var selectedKeyframes = timeline._selectInternal(
          //   selectingKeyframes,
          //   TimelineSelectionMode.Normal
          // ).changed;
          // for (var selectedKeyframe of selectedKeyframes) {
          //   selectedKeyframe.selected = true;
          // }

          var selectedKeyframes: TimelineKeyframe[] = [];
          timeline._forEachKeyframe(function (keyframe_) {
            var keyframeGroup_ = keyframe_.model.group?.toString()!;
            var [groupId_, spellId_, imageUrl_] = keyframeGroup_.split("__", 3);
            if (spellId_ === spellId) {
              // keyframe_.model.selected = true;
              var temp = keyframe_.model;
              console.log("Doubleclick", { temp, keyframe_ });
              temp.selected = true;
              console.log("Doubleclick", { temp, keyframe_ });
              selectedKeyframes.push(keyframe_.model);
            }
            return;
          });

          console.log("Doubleclick", { selectedKeyframes });
        }
      });

      // Synchronize component scroll renderer with HTML list of the nodes.
      timeline.onScroll(function (obj) {
        const options = timeline.getOptions();
        if (options) {
          if (outlineContainerRef.current) {
            outlineContainerRef.current.style.minHeight =
              obj.scrollHeight + "px";

            if (outlineScrollContainerRef.current) {
              outlineScrollContainerRef.current.scrollTop = obj.scrollTop;
            }
          }
        }
      });

      timeline.onScrollFinished(function (_) {
        // Stop move component screen to the timeline when user start manually scrolling.
        logMessage("on scroll finished", 2);
      });
    }
  }, [timeline, outlineContainerRef, outlineScrollContainerRef]);
};
