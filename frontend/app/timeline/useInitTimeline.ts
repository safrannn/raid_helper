import { useEffect, useState, createContext, useContext, useReducer, useCallback, useRef } from "react";
import { Timeline, TimelineInteractionMode, TimelineOptions } from "animation-timeline-js/lib/animation-timeline";
import useEditorStore from "@/app/timeline/states";
import { useShallow } from "zustand/react/shallow";

export const ROW_SIZE = 40;

interface UseInitTimelineArgs {
    timelineElRef: React.RefObject<HTMLDivElement>;
  }
  
export const useInitTimeline = ({ 
    timelineElRef,
  }: UseInitTimelineArgs) => {
    const [timeline, setTimeline] = useState<Timeline>();
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
              font: '13px sans-serif',
              timelineStyle:{
                width: 1,
                marginTop: 15,
                marginBottom: 20,
              },
              rowsStyle: {
                  height: ROW_SIZE,
                  marginBottom: 1,
              },
          });
          // Here you can subscribe on timeline component events
          if (newTimeline){
            newTimeline.setInteractionMode(TimelineInteractionMode.Pan);
            
            const defaultKeyframesRenderer = newTimeline?._renderKeyframe.bind(newTimeline);
            newTimeline._renderKeyframe = (ctx, keyframeViewModel) => {
              console.log("_renderKeyframe");
              if (typeof keyframeViewModel.model.group === "string" && keyframeViewModel.model.group.length > 1){
                const image = new Image();
                var [_groupId, imageUrl] = keyframeViewModel.model.group.split("__", 2);
                image.src = imageUrl;

                ctx.fillStyle = "white"; // Border color
                ctx.fillRect(keyframeViewModel.size.x + keyframeViewModel.size.height / 2 - 1, keyframeViewModel.size.y + 5, keyframeViewModel.size.width - 10, keyframeViewModel.size.height - 10);
                
                ctx.drawImage(image, keyframeViewModel.size.x + (keyframeViewModel.size.width / 2), keyframeViewModel.size.y + 6, keyframeViewModel.size.width - 12, keyframeViewModel.size.height - 12);
              } else {
                  defaultKeyframesRenderer(ctx, keyframeViewModel);
              }
            }
          }

          setTimeline(newTimeline);
          console.log({ newTimeline });
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
            2,
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
              2,
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
              2,
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
    }, [
      outlineContainerRef,
      outlineScrollContainerRef,
      timeline,
    ]);
};
  