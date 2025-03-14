"use client";

import { useEffect, useState, createContext, useContext, useReducer, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { PlusCircleIcon } from '@heroicons/react/24/solid';
import { Timeline, TimelineModel, TimelineOptions} from "animation-timeline-js/lib/animation-timeline";
import useEditorStore from "@/app/timeline/states";
import { setAutoFreeze } from "immer";
import { useShallow } from "zustand/react/shallow";


setAutoFreeze(false);

interface OutlineNodeProps {
  timeline: Timeline | undefined;
  index: number,
}

function OutlineNodeEntry({ timeline, index }: OutlineNodeProps){
  const { addTimelineRow, deleteTimelineRow, rows } = useEditorStore(
    useShallow((state) => ({
      addTimelineRow: state.addTimelineRow,
      deleteTimelineRow: state.deleteTimelineRow,
      rows: state.timelineModel.rows,
    })),
  );

  const row = rows[index];

  return (<div></div>)
}

// dbg!
function onAddPlayerEntry(){
  console.log("add player clicked")
}

function OutlineNode ({ timeline, index }: OutlineNodeProps){
  const { addTimelineRow, deleteTimelineRow, rows } = useEditorStore(
    useShallow((state) => ({
      addTimelineRow: state.addTimelineRow,
      deleteTimelineRow: state.deleteTimelineRow,
      rows: state.timelineModel.rows,
    })),
  );

  const onDeleteRow = useCallback(
    (indexToDelete: number) => {
      if (!timeline) {
        return;
      }
      deleteTimelineRow(indexToDelete);
    },
    [deleteTimelineRow, timeline],
  );

  const isLastRow = rows.length - 1 === index;
  return (
    <div> { isLastRow ? 
      (
        <Button size="sm" radius="sm" onPress={onAddPlayerEntry} >
          <PlusCircleIcon className="size-6 text-500" />
          Add new entry
        </Button>
      ) : (
        <OutlineNodeEntry timeline={timeline} index={index}/>
      )}
    </div>
  );
}

interface OutlineProps {
  timeline: Timeline | undefined;
}

const Outline = ({ timeline }: OutlineProps) => {
  const rows = useEditorStore((state) => state.timelineModel.rows);
  return (
    <>
      {rows.map((row, index) => {
        return (
          <OutlineNode
            key={row?.id ?? index}
            timeline={timeline}
            index={index}
          />
        );
      })}
    </>
  );
}

export default function TimelineOutline ({ timeline }: OutlineProps) {
  const outlineContainerRef = useRef<HTMLDivElement>(null);
  const outlineScrollContainerRef = useRef<HTMLDivElement>(null);
  
  const onWheelScroll = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
      // Set scroll back to timeline when mouse scroll over the outline
      if (timeline) {
          const unknownEvent = event as unknown;
          const coercedEvent = unknownEvent as WheelEvent;
          timeline._handleWheelEvent(coercedEvent);
      }
      },
      [timeline],
  );

  return (
    <div className="timelineOutline">
      <div className="timelineOutlineHeader" id="outline-header">
        Header
      </div>
      <div
          className="outline-scroll-container"
          id="outline-scroll-container"
          ref={outlineScrollContainerRef}
          onWheel={onWheelScroll}
      >
        <div className="outline">
          <div
            className="outline-items"
            id="outline-container"
            ref={outlineContainerRef}
          >
            <Outline timeline={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}

