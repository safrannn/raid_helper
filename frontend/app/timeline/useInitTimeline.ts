import { useEffect, useState } from "react";
import { Timeline, TimelineInteractionMode } from "animation-timeline-js";
import useEditorStore from "./states";
import { BossSpell } from "../types";

export const ROW_SIZE = 40;

interface UseInitTimelineArgs {
  timelineElRef: React.RefObject<HTMLDivElement>;
}

export const useInitTimeline = ({ timelineElRef }: UseInitTimelineArgs) => {
  const [timeline, setTimeline] = useState<Timeline>();
  const bossSpellMap = useEditorStore((state) => state.bossSpellMap);

  useEffect(() => {
    let newTimeline: Timeline | null = null;
    // On component init
    if (timelineElRef.current) {
      newTimeline = new Timeline({
        id: timelineElRef.current,
        snapEnabled: true,
        snapAllKeyframesOnMove: true,
        stepPx: 100,
        stepVal: 5000,
        zoom: 3,
        snapStep: 1000,
        font: "13px sans-serif",
        timelineStyle: {
          width: 1,
          marginTop: 15,
          marginBottom: 20,
        },
        rowsStyle: {
          height: ROW_SIZE,
          marginBottom: 10,
          groupsStyle: {
            // fillColor: semanticColors.dark.content2,
          },
        },
      });
      // Subscribe on timeline component events
      if (newTimeline) {
        newTimeline.setInteractionMode(TimelineInteractionMode.Pan);

        // set renderer
        const defaultKeyframesRenderer =
          newTimeline?._renderKeyframe.bind(newTimeline);
        newTimeline._renderKeyframe = (ctx, keyframeViewModel) => {
          if (
            typeof keyframeViewModel.model.group === "string" &&
            keyframeViewModel.model.group.length > 1
          ) {
            // draw image
            var [groupId, spellId, imageUrl] =
              keyframeViewModel.model.group.split("__", 3);
            const image = new Image();
            image.src = imageUrl;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(
              image,
              keyframeViewModel.size.x + keyframeViewModel.size.width / 2,
              keyframeViewModel.size.y + 6,
              keyframeViewModel.size.width - 12,
              keyframeViewModel.size.height - 12
            );

            // draw border
            ctx.lineWidth = 1;
            ctx.strokeStyle = "white";
            ctx.strokeRect(
              keyframeViewModel.size.x + keyframeViewModel.size.height / 2 - 1,
              keyframeViewModel.size.y + 5,
              keyframeViewModel.size.width - 10,
              keyframeViewModel.size.height - 10
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
  useEffect(() => {
    if (timeline) {
      console.log("-------USE EFFECT CALLED");
      timeline.offAll();

      timeline.onSelected(function (obj) {
        logMessage(
          "Selected Event: (" +
            obj.selected.length +
            "). changed selection :" +
            obj.changed.length,
          2
        );
      });

      timeline.onMouseDown(function (obj) {
        const type = obj.target ? obj.target.type : "";
        if (obj.pos) {
          console.log({ targ: obj.target });
          if (obj?.target?.keyframe) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const unknownGroup = obj.target.keyframe.group as any;
          }
          logMessage(
            "mousedown:" +
              obj.val +
              ".  target:" +
              type +
              ". " +
              Math.floor(obj.pos.x) +
              "x" +
              Math.floor(obj.pos.y),
            2
          );
        }
      });

      timeline.onDoubleClick(function (obj) {
        const type = obj.target ? obj.target.type : "";
        if (obj.pos) {
          logMessage(
            "doubleclick:" +
              obj.val +
              ".  target:" +
              type +
              ". " +
              Math.floor(obj.pos.x) +
              "x" +
              Math.floor(obj.pos.y),
            2
          );
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
