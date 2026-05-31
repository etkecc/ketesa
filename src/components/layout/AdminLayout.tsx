import GavelIcon from "@mui/icons-material/Gavel";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import ExtensionIcon from "@mui/icons-material/Extension";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TranslateIcon from "@mui/icons-material/Translate";
import { Box, Divider, ListItemIcon, ListItemText, MenuItem, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState, Suspense } from "react";
import {
  CheckForApplicationUpdate,
  AppBar,
  TitlePortal,
  InspectorButton,
  Confirm,
  Layout,
  LoadingIndicator,
  Logout,
  Menu,
  ToggleThemeButton,
  useLogout,
  UserMenu,
  useNotify,
  useStore,
  useLocaleState,
  useLocale,
  useLocales,
  useTranslate,
  useUserMenu,
  useResourceDefinitions,
} from "react-admin";

import { useMatch } from "react-router-dom";
import { setDataProviderNotifier } from "../../providers/data";
import { AdminClientConfigItems } from "../users/AdminClientConfigItems";
import Footer from "./Footer";
import { LoginMethod } from "../../components/login/types";
import { ServerProcessResponse, ServerStatusResponse } from "../../providers/types";
import { useServerVersions } from "../../providers/serverVersion";
import { ClearConfig } from "../../utils/config";
import { Icons, DefaultIcon } from "../../utils/icons";
import { EtkeAttribution } from "../etke.cc/EtkeAttribution";
import { ClearInstanceConfig, useInstanceConfig } from "../etke.cc/InstanceConfig";
import { ServerNotificationsBadge } from "../etke.cc/ServerNotificationsBadge";
import { EtkeStatusPoller, ServerStatusStyledBadge } from "../etke.cc/ServerStatusBadge";
import { BillingStatusBadge, BillingStatusPoller } from "../etke.cc/BillingStatusBadge";
import { isMAS } from "../../providers/data/mas";
import { useAppContext } from "../../Context";

const ServerVersionItems = () => {
  const serverVersions = useServerVersions();
  if (!serverVersions.synapse && !serverVersions.mas) return null;

  return (
    <>
      {serverVersions.synapse && (
        <MenuItem dense sx={{ pointerEvents: "none" }}>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Synapse v{serverVersions.synapse}</Typography>
          </ListItemText>
        </MenuItem>
      )}
      {serverVersions.mas && (
        <MenuItem dense sx={{ pointerEvents: "none" }}>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">MAS {serverVersions.mas}</Typography>
          </ListItemText>
        </MenuItem>
      )}
      <Divider sx={{ my: 0.5 }} />
    </>
  );
};

const AdminAppBarToolbar = () => (
  <>
    <ToggleThemeButton />
    <LoadingIndicator />
  </>
);

const LocaleMenuItems = () => {
  const locales = useLocales();
  const [locale, setLocale] = useLocaleState();
  if (!locales || locales.length <= 1) return null;
  return (
    <>
      {locales.map(loc => (
        <MenuItem key={loc.locale} dense selected={locale === loc.locale} onClick={() => setLocale(loc.locale)}>
          <ListItemIcon>
            <TranslateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{loc.name}</ListItemText>
        </MenuItem>
      ))}
      <Divider sx={{ my: 0.5 }} />
    </>
  );
};

const ProfileMenuItem = () => {
  const translate = useTranslate();
  const userMenu = useUserMenu();
  const onClose = userMenu?.onClose;
  const userId = localStorage.getItem("user_id");
  if (!userId) return null;
  return (
    <MenuItem
      dense
      onClick={() => {
        onClose?.();
        window.location.hash = `/users/${encodeURIComponent(userId)}`;
      }}
    >
      <ListItemIcon>
        <AccountCircleIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>{translate("ra.auth.user_menu")}</ListItemText>
    </MenuItem>
  );
};

const DonateMenuItem = () => {
  const translate = useTranslate();
  const userMenu = useUserMenu();
  const onClose = userMenu?.onClose;

  return (
    <MenuItem
      dense
      onClick={() => {
        onClose?.();
        window.location.hash = "/donate";
      }}
    >
      <ListItemIcon>
        <VolunteerActivismIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>{translate("etkecc.donate.menu_label")}</ListItemText>
    </MenuItem>
  );
};

export const AdminUserMenu = () => {
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  const checkLoginType = (ev: React.MouseEvent<HTMLDivElement>) => {
    const loginType: LoginMethod = (localStorage.getItem("login_type") || "credentials") as LoginMethod;
    if (loginType === "accessToken") {
      ev.stopPropagation();
      setOpen(true);
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    ClearConfig();
    ClearInstanceConfig();
    logout();
  };

  const handleDialogClose = () => {
    setOpen(false);
    ClearConfig();
    ClearInstanceConfig();
    window.location.reload();
  };

  return (
    <UserMenu>
      <ServerVersionItems />
      <ProfileMenuItem />
      <Divider sx={{ my: 0.5 }} />
      <AdminClientConfigItems />
      <LocaleMenuItems />
      <DonateMenuItem />
      <div onClickCapture={checkLoginType}>
        <Logout />
      </div>
      <Confirm
        isOpen={open}
        title="ketesa.auth.logout_access_token_dialog.title"
        content="ketesa.auth.logout_access_token_dialog.content"
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
        confirm="ketesa.auth.logout_access_token_dialog.confirm"
        cancel="ketesa.auth.logout_access_token_dialog.cancel"
      />
    </UserMenu>
  );
};

const AdminAppBar = () => {
  const icfg = useInstanceConfig();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <AppBar userMenu={<AdminUserMenu />} toolbar={<AdminAppBarToolbar />}>
      <TitlePortal sx={{ display: { xs: "none", sm: "block" } }} />
      {isSmall && <Box sx={{ flex: 1 }} />}
      {!icfg.disabled.notifications && <ServerNotificationsBadge />}
      {!isSmall && <InspectorButton />}
    </AppBar>
  );
};

const MAS_RESOURCE_PREFIX = "mas_";

/**
 * Renders resource menu items, excluding mas_* resources from the auto-list.
 * MAS resources (sessions, emails, users, upstream links) are managed inline on the user edit page.
 * Only upstream OAuth providers appear in the sidebar as a global admin config resource.
 */
const MAS_SESSION_RESOURCES = ["mas_upstream_oauth_providers"];

/**
 * Wraps Menu.Item and injects aria-current="page" on the active route.
 * Note: aria-current is forwarded to the underlying <a> via RA's MenuItemLink prop-forwarding.
 * If a future RA upgrade stops forwarding unknown props, aria-current will silently drop (progressive enhancement).
 */
export const ActiveMenuItemLink = ({ to, ...props }: React.ComponentProps<typeof Menu.Item> & { to: string }) => {
  const match = useMatch({ path: to, end: true });
  return <Menu.Item to={to} aria-current={match ? "page" : undefined} {...props} />;
};

/** Wraps Menu.ResourceItem and injects aria-current="page" on the active resource route. */
export const ActiveResourceItem = ({
  name,
  ...props
}: React.ComponentProps<typeof Menu.ResourceItem> & { name: string }) => {
  const match = useMatch({ path: `/${name}`, end: false });
  return <Menu.ResourceItem name={name} aria-current={match ? "page" : undefined} {...props} />;
};

const ResourceMenuItems = () => {
  const resources = useResourceDefinitions();
  const masEnabled = isMAS();

  return (
    <>
      {Object.keys(resources)
        .filter(name => !name.startsWith(MAS_RESOURCE_PREFIX) && resources[name].hasList)
        .map(name => (
          <span key={name}>
            <ActiveResourceItem name={name} />
            {name === "users" &&
              masEnabled &&
              MAS_SESSION_RESOURCES.map(
                masName =>
                  resources[masName] && (
                    <ActiveResourceItem
                      key={masName}
                      name={masName}
                      sx={{ "& .RaMenuItemLink-root": { pl: "20px" } }}
                    />
                  )
              )}
          </span>
        ))}
    </>
  );
};

const AdminMenu = props => {
  const locale = useLocale();
  const icfg = useInstanceConfig();
  const { menu, etkeccAdmin } = useAppContext();
  const etkeRoutesEnabled = Boolean(etkeccAdmin);
  const [serverProcess, _setServerProcess] = useStore<ServerProcessResponse>("serverProcess", {
    command: "",
    locked_at: "",
  });
  const [serverStatus, _setServerStatus] = useStore<ServerStatusResponse>("serverStatus", {
    success: false,
    ok: false,
    host: "",
    results: [],
  });

  return (
    <Menu
      {...props}
      sx={theme => ({
        color: theme.palette.mode === "dark" ? "#E0E0E0" : "#FFFFFF",
        "& .RaMenuItemLink-root": {
          justifyContent: "center",
          padding: "0px 2px 0px 0px",
          marginBottom: 0,
          borderLeft: "3px solid transparent",
          color: "inherit",
          transition: "background-color 150ms ease, border-color 150ms ease",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          },
        },
        "& .RaMenuItemLink-icon": {
          minWidth: 44,
          width: 44,
          height: 44,
          backgroundColor: "transparent",
          color: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "box-shadow 150ms ease, transform 150ms ease",
        },
        "& .MuiSvgIcon-root": {
          color: "inherit",
        },
        "& .RaMenuItemLink-active": {
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          borderLeftColor: theme.palette.mode === "dark" ? theme.palette.primary.main : "#FFFFFF",
          color: (theme.palette.mode === "dark" ? "#E0E0E0" : "#FFFFFF") + " !important",
        },
      })}
    >
      {etkeRoutesEnabled && <EtkeStatusPoller />}
      {etkeRoutesEnabled && !icfg.disabled.payments && <BillingStatusPoller />}
      {etkeRoutesEnabled && !icfg.disabled.monitoring && (
        <ActiveMenuItemLink
          key="server_status"
          to="/server_status"
          leftIcon={
            <ServerStatusStyledBadge
              inSidebar={true}
              command={serverProcess.command}
              locked_at={serverProcess.locked_at}
              isOkay={serverStatus.ok}
              isLoaded={serverStatus.success}
            />
          }
          primaryText="etkecc.status.name"
        />
      )}
      {etkeRoutesEnabled && !icfg.disabled.actions && (
        <ActiveMenuItemLink
          key="server_actions"
          to="/server_actions"
          leftIcon={<ManageHistoryIcon aria-hidden />}
          primaryText="etkecc.actions.name"
        />
      )}
      <ResourceMenuItems />
      {isMAS() && (
        <ActiveMenuItemLink
          key="mas_policy_data"
          to="/mas_policy_data"
          leftIcon={<GavelIcon aria-hidden />}
          primaryText="resources.mas_policy_data.name"
        />
      )}
      {etkeRoutesEnabled && !icfg.disabled.payments && (
        <ActiveMenuItemLink
          key="billing"
          to="/billing"
          leftIcon={<BillingStatusBadge />}
          primaryText="etkecc.billing.name"
        />
      )}
      {etkeRoutesEnabled && !icfg.disabled.payments && (
        <ActiveMenuItemLink
          key="components"
          to="/components"
          leftIcon={<ExtensionIcon aria-hidden />}
          primaryText="etkecc.components.name"
        />
      )}
      {etkeRoutesEnabled && !icfg.disabled.support && (
        <ActiveMenuItemLink
          key="support"
          to="/support"
          leftIcon={<SupportAgentIcon aria-hidden />}
          primaryText="etkecc.support.menu_label"
        />
      )}
      {menu &&
        menu.map(item => {
          const { url, icon, label, i18n } = item;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const IconComponent = Icons[icon] as React.ComponentType<any> | undefined;

          let primaryText = label;
          if (i18n && i18n[locale]) {
            primaryText = i18n[locale];
          }

          return (
            <Suspense key={url}>
              <Menu.Item
                to={url}
                target="_blank"
                primaryText={primaryText}
                leftIcon={IconComponent ? <IconComponent /> : <DefaultIcon />}
                onClick={props.onMenuClick}
              />
            </Suspense>
          );
        })}
    </Menu>
  );
};

const DataProviderNotifierBridge = () => {
  const notify = useNotify();
  useEffect(() => {
    setDataProviderNotifier((key: string) => notify(key, { type: "info" }));
    return () => setDataProviderNotifier(() => undefined);
  }, [notify]);
  return null;
};

export const AdminLayout = ({ children }) => {
  // Set the document language based on the selected locale
  const [locale, _setLocale] = useLocaleState();
  const icfg = useInstanceConfig();
  const translate = useTranslate();
  useEffect(() => {
    document.documentElement.lang = locale;

    // copy of the code from index.tsx to set base title dynamically
    document.head.dataset.baseTitle = icfg.name || "Ketesa";
    // set <title> based on instance name, only if it's not already set
    if (icfg.name && !document.title.includes(icfg.name)) {
      document.title = icfg.name;
    }

    if (icfg.favicon_url) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = icfg.favicon_url;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = icfg.favicon_url;
        document.getElementsByTagName("head")[0].appendChild(newLink);
      }
    }
  }, [locale, icfg.name, icfg.favicon_url]);

  return (
    <>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          transform: "translateY(-100%)",
          "&:focus": { transform: "translateY(0)" },
          zIndex: 9999,
          top: 0,
          left: 0,
          p: 1,
          bgcolor: "background.paper",
          color: "text.primary",
        }}
      >
        {translate("ra.navigation.skip_nav")}
      </Box>
      <DataProviderNotifierBridge />
      <Layout
        appBar={AdminAppBar}
        menu={AdminMenu}
        sx={theme => ({
          minWidth: 0,
          ["& .RaLayout-appFrame"]: {
            minHeight: "90vh",
            height: "90vh",
          },
          ["& .RaLayout-content"]: {
            minWidth: 0,
            marginBottom: { xs: "4rem", sm: "3rem" },
          },
          ["& .RaLayout-contentWithSidebar > .MuiDrawer-root"]: {
            "& .MuiPaper-root": {
              backgroundColor: (theme.palette.mode === "dark" ? "#080D12" : "#334258") + " !important",
            },
            "& .RaSidebar-fixed": {
              backgroundColor: theme.palette.mode === "dark" ? "#080D12" : "#334258",
            },
          },
        })}
      >
        <Box id="main-content" tabIndex={-1} sx={{ outline: 0 }}>
          {children}
        </Box>
        <CheckForApplicationUpdate />
      </Layout>
      <EtkeAttribution>
        <Footer />
      </EtkeAttribution>
    </>
  );
};

export default AdminLayout;
