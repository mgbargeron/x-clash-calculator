import { useEffect, useState } from "react";

export function useMapToolbarServerControls(activeServerId: string) {
  const [serverEditDraft, setServerEditDraft] = useState(activeServerId);
  const [serverEditInvalid, setServerEditInvalid] = useState(false);
  const [isEditingServerId, setIsEditingServerId] = useState(false);

  useEffect(() => {
    setServerEditDraft(activeServerId);
    setServerEditInvalid(false);
    setIsEditingServerId(false);
  }, [activeServerId]);

  return {
    serverEditDraft,
    serverEditInvalid,
    isEditingServerId,
    setServerEditDraft,
    setServerEditInvalid,
    setIsEditingServerId,
  };
}