import BlockIcon from "@mui/icons-material/Block";
import ClearIcon from "@mui/icons-material/Clear";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { Tooltip } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button, ButtonProps, useDataProvider, useNotify, useRecordContext, useTranslate } from "react-admin";

export const QuarantineMediaButton = (props: ButtonProps) => {
  const record = useRecordContext();
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const [isQuarantined, setIsQuarantined] = useState<boolean | null>(null);

  const { mutate: quarantine, isPending: isQuarantining } = useMutation({
    mutationFn: () => dataProvider.create("quarantine_media", { data: record! }),
    onSuccess: () => {
      notify("resources.quarantine_media.action.send_success");
      setIsQuarantined(true);
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onError: (error: any) =>
      notify(error?.message || "resources.quarantine_media.action.send_failure", {
        type: "error",
        messageArgs: { error: error },
      }),
  });

  const { mutate: unquarantine, isPending: isUnquarantining } = useMutation({
    mutationFn: () => dataProvider.delete("quarantine_media", { id: record!.id, previousData: record }),
    onSuccess: () => {
      notify("resources.quarantine_media.action.send_success");
      setIsQuarantined(false);
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onError: (error: any) =>
      notify(error?.message || "resources.quarantine_media.action.send_failure", {
        type: "error",
        messageArgs: { error: error },
      }),
  });

  if (!record) return null;

  const isLoading = isQuarantining || isUnquarantining;
  const quarantinedBy =
    isQuarantined === null ? record.quarantined_by : isQuarantined ? localStorage.getItem("user_id") || "admin" : "";

  return (
    <>
      {record.safe_from_quarantine && (
        <Tooltip
          title={translate("resources.quarantine_media.action.none", {
            _: "resources.quarantine_media.action.none",
          })}
        >
          <div>
            <Button {...props} label="resources.quarantine_media.action.none" disabled={true}>
              <ClearIcon />
            </Button>
          </div>
        </Tooltip>
      )}
      {quarantinedBy && (
        <Tooltip
          title={translate("resources.quarantine_media.action.delete", {
            _: "resources.quarantine_media.action.delete",
          })}
        >
          <div>
            <Button
              {...props}
              label="resources.quarantine_media.action.delete"
              onClick={() => unquarantine()}
              disabled={isLoading}
            >
              <RemoveCircleOutlineIcon color="error" />
            </Button>
          </div>
        </Tooltip>
      )}
      {!record.safe_from_quarantine && !quarantinedBy && (
        <Tooltip
          title={translate("resources.quarantine_media.action.create", {
            _: "resources.quarantine_media.action.create",
          })}
        >
          <div>
            <Button
              {...props}
              label="resources.quarantine_media.action.create"
              onClick={() => quarantine()}
              disabled={isLoading}
            >
              <BlockIcon />
            </Button>
          </div>
        </Tooltip>
      )}
    </>
  );
};
