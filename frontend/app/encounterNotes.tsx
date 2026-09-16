"use client";

import { Button, Form, PressEvent, Textarea } from "@heroui/react";
import { useEffect, useState } from "react";
import useEditorStore from "@/app/states";
import {
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/solid";
import { addToast } from "@heroui/toast";
import { useShallow } from "zustand/shallow";

export const EncounterNotes = () => {
  const { bossName, difficulty, allowLoadFight } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      difficulty: state.difficulty,
      allowLoadFight: state.allowLoadFight,
    })),
  );
  const [note, setNote] = useState<string>("");
  const [isButtonsDisabled, setButtonDisabled] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note);
  };

  const fetchNoteData = () => {
    const newParams = new URLSearchParams({
      boss_name: bossName,
      difficulty: difficulty,
    });
    const paramsString = newParams.toString();
    var encodedUrl = `http://localhost:3001/get_fight_note?` + paramsString;
    fetch(encodedUrl)
      .then((response) => response.json())
      .then((data: string) => {
        setNote(data);
      })
      .catch((error) =>
        console.error(
          `Error fetching note for boss [${bossName}(${difficulty})].`,
          error,
        ),
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
    const newParams = new URLSearchParams({
      boss_name: bossName,
      difficulty: difficulty,
      note: note,
    });
    const paramsString = newParams.toString();
    var encodedUrl = `http://localhost:3001/update_fight_note?` + paramsString;
    console.log("EncounterNotes.handleSubmit.encodedUrl", {
      bossName,
      encodedUrl,
    });

    fetch(encodedUrl, { method: "POST" }).catch((error) =>
      console.error(
        `Error updating note for boss [${bossName}(${difficulty})].`,
        error,
      ),
    );
  };

  return (
    <Form
      className="w-full h-full flex flex-col gap-2 p-2"
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
        disableAutosize
        classNames={{
          base: "flex-1 min-h-0",
          inputWrapper: "!h-full",
          innerWrapper: "flex-1 min-h-0",
          input: "h-full self-stretch resize-none",
        }}
        isDisabled={isButtonsDisabled}
        value={note}
        onValueChange={setNote}
        placeholder="Enter your note here..."
        variant="faded"
      />
      <div className="flex flex-row w-full gap-2 shrink-0">
        <Button
          className="w-1/2  hover:bg-blue-500 hover:font-semibold"
          color="default"
          radius="sm"
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
          className="w-1/2  hover:bg-blue-500 hover:font-semibold"
          color="default"
          radius="sm"
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
