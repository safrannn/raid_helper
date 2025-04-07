"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "@heroui/button";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { Timeline } from "animation-timeline-js/lib/animation-timeline";
import useOnClickPlay from "@/app/timeline/onClickPlay";
import useEditorStore from "@/app/timeline/states";
import { BossList } from "../bossList";

interface TimelineButtonsProps {
  timeline: Timeline | undefined;
  timelineElRef: React.RefObject<HTMLDivElement>;
}

export const TimelineToolbar = ({
  timeline,
  timelineElRef,
}: TimelineButtonsProps) => {
  const { timelinePlayingState, setTimelinePlayingState, isTimelinePlayable } =
    useEditorStore(
      useShallow((state) => ({
        timelinePlayingState: state.timelinePlayingState,
        setTimelinePlayingState: state.setTimelinePlayingState,
        isTimelinePlayable: state.isTimelinePlayable,
      }))
    );

  const { onClickPlay } = useOnClickPlay({ timeline, timelineElRef });

  const isTimelinePlaying = timelinePlayingState === "playing";

  const onPauseClick = useCallback(() => {
    setTimelinePlayingState("idle");
    if (timeline) {
      timeline.setOptions({ timelineDraggable: true });
    }
  }, [setTimelinePlayingState, timeline]);

  return (
    <HeroUINavbar
      className="bg-transparent h-12 rounded-t-md bg-content2"
      isBordered
      maxWidth="full"
      position="sticky"
    >
      <NavbarContent className="h-12 w-full" justify="center">
        <BossList timeline={timeline} timelineElRef={timelineElRef} />
      </NavbarContent>

      <NavbarContent className="h-12 " justify="end">
        <NavbarItem>
          {!isTimelinePlaying ? (
            <Button isIconOnly onPress={onClickPlay} className="bg-transparent">
              <PlayIcon className="size-6 text-500" />
            </Button>
          ) : (
            <Button
              isIconOnly
              onPress={onPauseClick}
              className="bg-transparent"
            >
              <PauseIcon className="size-6 text-500" />
            </Button>
          )}
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
};
