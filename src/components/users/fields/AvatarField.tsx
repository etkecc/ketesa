import { Avatar, AvatarProps, Badge, Tooltip } from "@mui/material";
import { get } from "lodash";
import { useState, useEffect, useCallback, useRef } from "react";
import { FieldProps, useRecordContext, useTranslate } from "react-admin";

import { fetchAuthenticatedMedia } from "../../../utils/fetchMedia";
import { isMXID, isSystemUser } from "../../../utils/mxid";

const AvatarField = ({ source, ...rest }: AvatarProps & FieldProps) => {
  const { alt, classes, sizes, sx, variant } = rest;
  const record = useRecordContext(rest);
  const translate = useTranslate();
  const mxcURL = get(record, source)?.toString();

  const [src, setSrc] = useState<string>("");
  const srcRef = useRef<string>("");

  const fetchAvatar = useCallback(async (mxcURL: string) => {
    const response = await fetchAuthenticatedMedia(mxcURL, "thumbnail");
    const blob = await response.blob();
    const blobURL = URL.createObjectURL(blob);
    srcRef.current = blobURL;
    setSrc(blobURL);
  }, []);

  useEffect(() => {
    if (mxcURL) {
      fetchAvatar(mxcURL);
    } else {
      // Avatar was removed; revoke the old blob URL and clear the displayed image
      if (srcRef.current) {
        URL.revokeObjectURL(srcRef.current);
        srcRef.current = "";
      }
      setSrc("");
    }

    return () => {
      if (srcRef.current) {
        URL.revokeObjectURL(srcRef.current);
      }
    };
  }, [mxcURL, fetchAvatar]);

  // a hacky way to handle both users and rooms,
  // where users have an ID, may have a name, and may have a displayname
  // and rooms have an ID and may have a name
  let letter = "";
  if (record?.id) {
    letter = record.id[0].toUpperCase();
  }
  if (record?.name) {
    letter = record.name[0].toUpperCase();
  }
  if (record?.displayname) {
    letter = record.displayname[0].toUpperCase();
  }

  // hacky way to determine the user type
  let badge = "";
  let tooltip = "";
  if (isMXID(record?.id)) {
    switch (record?.user_type) {
      case "bot":
        badge = "🤖";
        tooltip = translate("resources.users.badge.bot");
        break;
      case "support":
        badge = "📞";
        tooltip = translate("resources.users.badge.support");
        break;
      default:
        badge = "👤";
        tooltip = translate("resources.users.badge.regular");
        break;
    }

    if (!record?.id.endsWith(localStorage.getItem("home_server") || "")) {
      badge = "🌐";
      tooltip = translate("resources.users.badge.federated");
    }
    if (record?.admin) {
      badge = "👑";
      tooltip = translate("resources.users.badge.admin");
    }
    if (isSystemUser(record?.name) || record?.appservice_id) {
      badge = "🛡️";
      tooltip = `${translate("resources.users.badge.system_managed")} (${tooltip})`;
    }
    if (localStorage.getItem("user_id") === record?.id) {
      badge = "🧙‍";
      tooltip = `${translate("resources.users.badge.you")} (${tooltip})`;
    }
  }

  // scale badge to avatar size
  const sxObj = (sx && typeof sx === "object" && !Array.isArray(sx) ? sx : {}) as Record<string, unknown>;
  const avatarHeight = sxObj.height || sxObj.width || 40;
  const avatarSize = typeof avatarHeight === "string" ? parseInt(avatarHeight, 10) : (avatarHeight as number);
  const badgeFontSize = Math.max(10, Math.round(avatarSize * 0.18));

  // if there is a badge, wrap the Avatar in a Badge and a Tooltip
  if (badge) {
    return (
      <Tooltip
        title={tooltip}
        slotProps={{ tooltip: { sx: { fontSize: Math.max(11, Math.round(avatarSize * 0.08)) } } }}
      >
        <Badge
          badgeContent={badge}
          overlap="circular"
          sx={{ "& .MuiBadge-badge": { width: "10px", fontSize: badgeFontSize } }}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
        >
          <Avatar alt={alt} classes={classes} sizes={sizes} src={src} sx={sx} variant={variant}>
            {letter}
          </Avatar>
        </Badge>
      </Tooltip>
    );
  }

  return (
    <span style={{ display: "inline-block" }}>
      <Avatar alt={alt} classes={classes} sizes={sizes} src={src} sx={sx} variant={variant}>
        {letter}
      </Avatar>
    </span>
  );
};

export default AvatarField;
