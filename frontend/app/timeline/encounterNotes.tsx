"use client";

import {
  Button,
  Form,
  Input,
  PressEvent,
  ScrollShadow,
  Textarea,
} from "@heroui/react";
import { useEffect, useState, useMemo } from "react";
import { Boss, Raid, TimelineBossSpellsReturn } from "@/app/types";
import { Timeline, TimelineModel } from "animation-timeline-js";
import useEditorStore from "@/app/timeline/states";
import {
  ArrowUpTrayIcon,
  ArrowUpOnSquareIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/solid";
import { addToast, ToastProvider } from "@heroui/toast";

export const EncounterNotes = () => {
  const [note, setNote] = useState<string>("");
  const bossName = useEditorStore((state) => state.bossName);
  const difficulty = useEditorStore((state) => state.difficulty);
  const allowLoadFight = useEditorStore((state) => state.allowLoadFight);
  const [isButtonsDisabled, setButtonDisabled] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note);
  };

  const fetchNoteData = () => {
    var encodedUrl = encodeURI(
      `http://localhost:3001/get_fight_note/${bossName}/${difficulty}`
    );
    fetch(encodedUrl)
      .then((response) => response.json())
      .then((data: string) => {
        setNote(data);
      })
      .catch((error) =>
        console.error(
          `Error fetching note for boss [${bossName}(${difficulty})].`,
          error
        )
      );
  };

  useEffect(() => {
    if (bossName.length > 0 && difficulty.length > 0) {
      fetchNoteData();
    }
  }, [bossName, difficulty]);

  useEffect(() => {
    setButtonDisabled(!allowLoadFight);
  }, [allowLoadFight]);

  const handleSubmit = (_e: PressEvent) => {
    // var encodedUrl = `http://localhost:3001/update_fight_note/${bossName}/${difficulty}/${note}`;
    var encodedUrl = encodeURI(
      `http://localhost:3001/update_fight_note/${bossName}/${difficulty}/${note}`
    );
    console.log("EncounterNotes.handleSubmit.encodedUrl", {
      bossName,
      encodedUrl,
    });

    fetch(encodedUrl, { method: "POST" }).catch((error) =>
      console.error(
        `Error updating note for boss [${bossName}(${difficulty})].`,
        error
      )
    );
  };

  return (
    <Form
      className="justify-end w-full mt-auto p-2"
      onSubmit={(e) => {
        e.preventDefault();
        let data = Object.fromEntries(new FormData(e.currentTarget));
        console.log("submit note", { data });
      }}
    >
      <Textarea
        id="note"
        name="note"
        label="Note for this fight"
        className=""
        isDisabled={isButtonsDisabled}
        value={note}
        onValueChange={setNote}
        placeholder="Enter your note here..."
        minRows={7}
        maxRows={7}
        variant="faded"
      />
      <div className="flex flex-row w-full gap-2">
        <Button
          className="w-1/2"
          color="primary"
          isDisabled={isButtonsDisabled}
          onPress={handleCopy}
          onPressEnd={() => {
            if (note.length > 0) {
              addToast({
                title: "Copied",
                color: "success",
              });
            }
          }}
        >
          Copy
          <DocumentDuplicateIcon className="size-4 text-500" />
        </Button>
        <Button
          className="w-1/2"
          color="primary"
          isDisabled={isButtonsDisabled}
          onPress={handleSubmit}
        >
          Submit
          <ArrowUpTrayIcon className="size-4 text-500" />
        </Button>
      </div>
    </Form>
  );
};
