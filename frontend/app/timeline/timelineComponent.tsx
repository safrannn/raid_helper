"use client";

import { useEffect, useRef } from "react";
import { BossList } from "@/app/bossList";
import { TimelineToolbar }  from "@/app/timeline/timelineToolBar";
import TimelineOutline  from "@/app/timeline/timelineOutline";
import useEditorStore from "@/app/timeline/states";
import { useInitTimeline, useInitTimelineListeners } from "@/app/timeline/useInitTimeline";


export const TimelineComponent = () => {
  const timelineElRef = useRef<HTMLDivElement>(null);
  const outlineContainerRef = useRef<HTMLDivElement>(null);
  const outlineScrollContainerRef = useRef<HTMLDivElement>(null);

  const { timeline } = useInitTimeline({ timelineElRef });
  useInitTimelineListeners({
      timeline,
      outlineContainerRef,
      outlineScrollContainerRef,
    });

  const timelineModel = useEditorStore((state) => state.timelineModel);
  
  useEffect(() => {
      timeline?.setModel(timelineModel);
  }, [timelineModel, timeline]);

  if (timeline){
    console.log("TimelineComponent: override _renderKeyframe.");
    const defaultKeyframesRenderer = timeline?._renderKeyframe.bind(timeline);
    timeline._renderKeyframe = (ctx, keyframeViewModel) => {
      if (typeof keyframeViewModel.model.group === "string" && keyframeViewModel.model.group.length > 1){
        const image = new Image();
        image.onload = () => {
            timeline?.redraw();
        };
        image.src = keyframeViewModel.model.group;
          ctx.drawImage(image, keyframeViewModel.size.x - 10, keyframeViewModel.size.y - 10, keyframeViewModel.size.width + 10, keyframeViewModel.size.height + 10);
      } else {
          defaultKeyframesRenderer(ctx, keyframeViewModel);
      }
    }
  }

  return(
      <section className="w-full gap-0">
        <BossList timeline={timeline} timelineElRef={timelineElRef} />
        <section className="w-full">
          <TimelineToolbar timeline={timeline} timelineElRef={timelineElRef} />
          <div className="timelineContainer">
              <TimelineOutline timeline={timeline} />
              <div className="timelineSpellBar" >
                <div ref={timelineElRef} id="timeline"/>
              </div>
          </div>
        </section>
      </section>
  );
}

