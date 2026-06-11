import DownloadIcon from "@mui/icons-material/Download";
import DownloadingIcon from "@mui/icons-material/Downloading";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import { Box, Tooltip } from "@mui/material";
import { get } from "lodash";
import { useState } from "react";
import { Button, useNotify, useRecordContext, useTranslate } from "react-admin";

import { decodeURLComponent } from "../../utils/safety";
import { fetchAuthenticatedMedia } from "../../utils/fetchMedia";
import createLogger from "../../utils/logger";

const log = createLogger("media");

// Revoke the blob URL long after it is consumed: revoking too early made the new tab show
// ERR_FILE_NOT_FOUND before it finished loading. The browser frees it on unload anyway.
const BLOB_URL_REVOKE_DELAY_MS = 60_000;

// Types safe to open as a top-level document in our origin. SVG/HTML execute script there
// (a blob: URL inherits our origin), so anything off this list is forced to download instead.
const NEW_TAB_SAFE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);

interface ViewMediaButtonProps {
  mxcURL: string;
  label: string;
  uploadName: string;
  mimetype?: string;
  preview?: boolean;
}

export const ViewMediaButton = ({ mxcURL, label, uploadName, mimetype, preview = false }: ViewMediaButtonProps) => {
  const translate = useTranslate();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const notify = useNotify();
  // Exclude SVG: opened in a new tab it runs as a document in our origin and can execute script.
  const isImage = mimetype && mimetype.startsWith("image/") && mimetype !== "image/svg+xml" && preview;

  const openFileInNewTab = (blobURL: string) => {
    const anchorElement = document.createElement("a");
    anchorElement.href = blobURL;
    anchorElement.target = "_blank";
    anchorElement.rel = "noopener noreferrer";
    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
    setTimeout(() => URL.revokeObjectURL(blobURL), BLOB_URL_REVOKE_DELAY_MS);
  };

  const downloadFile = (blobURL: string) => {
    log.debug("download triggered", { uploadName });
    const anchorElement = document.createElement("a");
    anchorElement.href = blobURL;
    anchorElement.download = uploadName;
    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
    setTimeout(() => URL.revokeObjectURL(blobURL), BLOB_URL_REVOKE_DELAY_MS);
  };

  const handleFile = async (openInNewTab: boolean) => {
    const setLoading = openInNewTab ? setLoadingPreview : setLoadingDownload;
    setLoading(true);
    try {
      const response = await fetchAuthenticatedMedia(mxcURL, "original");

      if (response.ok) {
        const blob = await response.blob();
        const blobURL = URL.createObjectURL(blob);
        // Gate on the actual blob type, not the claimed media_type: a federated server can lie.
        const blobType = blob.type.split(";")[0].trim().toLowerCase();
        if (openInNewTab && NEW_TAB_SAFE_MIME_TYPES.has(blobType)) {
          openFileInNewTab(blobURL);
        } else {
          downloadFile(blobURL);
        }
      } else {
        // An upstream/proxy error body may not be JSON; don't let .json() throw into the catch.
        const body = await response.json().catch(() => ({}));
        notify("resources.room_media.action.error", {
          messageArgs: {
            errcode: body.errcode,
            errstatus: response.status,
            error: body.error,
          },
          type: "error",
        });
      }
    } catch (error) {
      log.error("failed to load media", { error });
      notify("ra.notification.http_error", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box display="flex" alignItems="center">
        <Tooltip title={translate("resources.users_media.action.open")}>
          <span>
            {isImage && (
              <Button
                disabled={loadingPreview}
                onClick={() => handleFile(true)}
                style={{ minWidth: 0, padding: 0, marginRight: 8 }}
              >
                {loadingPreview ? <DownloadingIcon /> : <FileOpenIcon />}
              </Button>
            )}
          </span>
        </Tooltip>
        <Button
          disabled={loadingDownload}
          onClick={() => handleFile(false)}
          style={{ minWidth: 0, padding: 0, marginRight: 8 }}
        >
          {loadingDownload ? <DownloadingIcon /> : <DownloadIcon />}
        </Button>
        <span>{label}</span>
      </Box>
    </>
  );
};

export const MediaIDField = ({ source }) => {
  const record = useRecordContext();
  if (!record) {
    return null;
  }
  const homeserver = localStorage.getItem("home_server");

  const mediaID = get(record, source)?.toString();
  if (!mediaID) {
    return null;
  }

  let uploadName = mediaID;
  if (get(record, "upload_name")) {
    uploadName = decodeURLComponent(get(record, "upload_name")?.toString());
  }

  let mxcURL = mediaID;
  if (!mediaID.startsWith(`mxc://${homeserver}`)) {
    // this is user's media, where mediaID doesn't have the mxc://home_server/ prefix as it has in the rooms
    mxcURL = `mxc://${homeserver}/${mediaID}`;
  }

  let preview = true;
  if (get(record, "quarantined_by")) {
    preview = false;
  }

  return (
    <ViewMediaButton
      mxcURL={mxcURL}
      label={mediaID}
      uploadName={uploadName}
      mimetype={record.media_type}
      preview={preview}
    />
  );
};

export const ReportMediaContent = ({ source }) => {
  const record = useRecordContext();
  if (!record) {
    return null;
  }

  const mxcURL = get(record, source)?.toString();
  if (!mxcURL) {
    return null;
  }

  let uploadName = "";
  if (get(record, "event_json.content.body")) {
    uploadName = decodeURLComponent(get(record, "event_json.content.body")?.toString());
  }

  return <ViewMediaButton mxcURL={mxcURL} label={mxcURL} uploadName={uploadName} mimetype={record.media_type} />;
};
