import { createTheme, keyframes, type ThemeOptions } from "@mui/material/styles";

const headingFont = '"Work Sans", system-ui, sans-serif';
const bodyFont = '"Inter", "Work Sans", system-ui, sans-serif';

const typography: ThemeOptions["typography"] = {
  fontFamily: bodyFont,
  h1: { fontFamily: headingFont, fontWeight: 600 },
  h2: { fontFamily: headingFont, fontWeight: 600 },
  h3: { fontFamily: headingFont, fontWeight: 600 },
  h4: { fontFamily: headingFont, fontWeight: 600 },
  h5: { fontFamily: headingFont, fontWeight: 600 },
  h6: { fontFamily: headingFont, fontWeight: 400 },
};

const shape = { borderRadius: 8 };

// react-admin's default theme invariants: required for proper form field sizing
const raInvariants: ThemeOptions["components"] = {
  MuiAutocomplete: {
    defaultProps: {
      fullWidth: true,
    },
    variants: [
      {
        props: {},
        style: ({ theme }) => ({
          [(theme as ReturnType<typeof createTheme>).breakpoints.down("sm")]: { width: "100%" },
        }),
      },
    ],
  },
  MuiTextField: {
    defaultProps: {
      variant: "filled",
      margin: "dense",
      size: "small",
      fullWidth: true,
    },
    variants: [
      {
        props: {},
        style: ({ theme }) => ({
          [(theme as ReturnType<typeof createTheme>).breakpoints.down("sm")]: { width: "100%" },
        }),
      },
    ],
  },
  MuiFormControl: {
    defaultProps: {
      variant: "filled",
      margin: "dense",
      size: "small",
      fullWidth: true,
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        "&.MuiTableCell-paddingCheckbox": {
          padding: "0 8px 0 8px",
        },
      },
    },
  },
  RaSimpleFormIterator: {
    defaultProps: {
      fullWidth: true,
    },
  },
  RaTranslatableInputs: {
    defaultProps: {
      fullWidth: true,
    },
  },
};

const buttonShimmer = keyframes`
  0% { transform: translateX(-200%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
`;

// Focus ring using primary color: keyboard-only via :focus-visible
const focusRing = (color: string) => ({
  "&:focus-visible": {
    outline: "none",
    boxShadow: `0 0 0 3px ${color}`,
  },
});

const sharedComponents: ThemeOptions["components"] = {
  ...raInvariants,
  MuiButtonBase: {
    styleOverrides: {
      root: ({ theme }) =>
        focusRing(theme.palette.mode === "dark" ? "rgba(244, 147, 0, 0.35)" : "rgba(91, 141, 239, 0.4)"),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 4,
        textTransform: "none" as const,
        fontWeight: 500,
        fontSize: "0.9rem",
        padding: "6px 18px",
        transition: "all 150ms ease",
        position: "relative" as const,
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
          transform: "translateX(-200%) skewX(-15deg)",
          pointerEvents: "none",
          transition: "none",
        },
        "&:hover::after": {
          animation: `${buttonShimmer} 0.6s ease-out`,
        },
        "&:hover": {
          boxShadow: theme.palette.mode === "dark" ? "0 0 16px rgba(244,147,0,0.2)" : "0 0 16px rgba(91,141,239,0.25)",
        },
      }),
      sizeSmall: {
        fontSize: "0.85rem",
        padding: "5px 14px",
      },
      sizeLarge: {
        fontSize: "1rem",
        padding: "8px 24px",
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 4,
        transition: "border-color 150ms ease, box-shadow 150ms ease",
        ...focusRing(theme.palette.mode === "dark" ? "rgba(244, 147, 0, 0.3)" : "rgba(91, 141, 239, 0.3)"),
      }),
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: ({ theme }) =>
        focusRing(theme.palette.mode === "dark" ? "rgba(244, 147, 0, 0.3)" : "rgba(91, 141, 239, 0.3)"),
    },
  },
  MuiChip: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 4,
        transition: "background-color 150ms ease, box-shadow 150ms ease",
        ...focusRing(theme.palette.mode === "dark" ? "rgba(244, 147, 0, 0.35)" : "rgba(91, 141, 239, 0.4)"),
      }),
    },
  },
  MuiLink: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 2,
        ...focusRing(theme.palette.mode === "dark" ? "rgba(244, 147, 0, 0.35)" : "rgba(91, 141, 239, 0.4)"),
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        transition: "box-shadow 150ms ease, border-color 150ms ease",
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
      },
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        "&:not(.MuiBackdrop-invisible)": {
          backdropFilter: "blur(4px)",
        },
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: "background-color 150ms ease",
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        "& .MuiTableCell-head": {
          fontWeight: 600,
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        transition: "background-color 150ms ease",
      },
    },
  },
  MuiSnackbarContent: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontSize: "0.9rem",
        fontWeight: 500,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontSize: "0.9rem",
        fontWeight: 500,
        alignItems: "center",
      },
      standardSuccess: ({ theme }) => ({
        backgroundColor: theme.palette.mode === "dark" ? "rgba(74, 222, 128, 0.12)" : theme.palette.success.light,
        color: theme.palette.mode === "dark" ? "#4ADE80" : theme.palette.success.main,
      }),
      standardError: ({ theme }) => ({
        backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 107, 122, 0.12)" : theme.palette.error.light,
        color: theme.palette.mode === "dark" ? "#FF6B7A" : theme.palette.error.main,
      }),
      standardWarning: ({ theme }) => ({
        backgroundColor: theme.palette.mode === "dark" ? "rgba(251, 191, 36, 0.12)" : theme.palette.warning.light,
        color: theme.palette.mode === "dark" ? "#FBBF24" : theme.palette.warning.main,
      }),
      standardInfo: ({ theme }) => ({
        backgroundColor: theme.palette.mode === "dark" ? "rgba(91, 141, 239, 0.12)" : "#EFF6FF",
        color: theme.palette.mode === "dark" ? "#5B8DEF" : theme.palette.info.main,
      }),
    },
  },
};

const scrollbarLight = {
  scrollbarColor: "rgba(0,0,0,0.2) transparent",
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.2)", borderRadius: 4 },
  "&::-webkit-scrollbar-thumb:hover": { background: "rgba(0,0,0,0.3)" },
};

const scrollbarDark = {
  scrollbarColor: "rgba(255,255,255,0.15) transparent",
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.15)", borderRadius: 4 },
  "&::-webkit-scrollbar-thumb:hover": { background: "rgba(255,255,255,0.25)" },
};

const lightComponents: ThemeOptions["components"] = {
  ...sharedComponents,
  MuiCssBaseline: {
    styleOverrides: {
      body: scrollbarLight,
      "*": scrollbarLight,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #E5E7EB",
      },
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        "&$disabled": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderBottom: "none",
      },
    },
  },
  RaToolbar: {
    styleOverrides: {
      root: {
        backgroundColor: "transparent",
        "&.RaToolbar-mobileToolbar": {
          position: "static",
        },
      },
    },
  },
  RaSidebar: {
    styleOverrides: {
      root: {
        "& .MuiPaper-root": {
          backgroundColor: "#334258 !important",
          color: "#FFFFFF",
        },
      },
    },
  },
};

const darkComponents: ThemeOptions["components"] = {
  ...sharedComponents,
  MuiCssBaseline: {
    styleOverrides: {
      body: scrollbarDark,
      "*": scrollbarDark,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        border: "none",
        backgroundImage: "none",
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "none",
        borderBottom: "1px solid #253038",
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
      },
    },
  },
  RaToolbar: {
    styleOverrides: {
      root: {
        backgroundColor: "transparent",
        "&.RaToolbar-mobileToolbar": {
          position: "static",
          marginBottom: "1rem",
        },
      },
    },
  },
  RaSidebar: {
    styleOverrides: {
      root: {
        "& .MuiPaper-root": {
          backgroundColor: "#080D12 !important",
          color: "#E0E0E0",
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    contrastThreshold: 4.5,
    primary: { main: "#1858D5" },
    secondary: { main: "#334258" },
    error: { main: "#DC3545", light: "#FEF2F2" },
    warning: { main: "#D97706", light: "#FFFBEB", contrastText: "#7C2D12" },
    success: { main: "#248E39", light: "#F0FDF4" },
    info: { main: "#1858D5" },
    background: { default: "#F5F5F5", paper: "#FFFFFF" },
    text: { primary: "#1A1A2E", secondary: "#575E6B" },
    divider: "#E5E7EB",
  },
  typography,
  shape,
  sidebar: { width: 240, closedWidth: 50 },
  components: lightComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    contrastThreshold: 4.5,
    primary: { main: "#F49300" },
    secondary: { main: "#5B8DAF" },
    error: { main: "#FF6B7A" },
    warning: { main: "#FBBF24" },
    success: { main: "#4ADE80" },
    info: { main: "#5B8DEF" },
    background: { default: "#0C1318", paper: "#151C24" },
    text: { primary: "#E8E8ED", secondary: "#9CA3AF" },
    divider: "#253038",
  },
  typography,
  shape,
  sidebar: { width: 240, closedWidth: 50 },
  components: darkComponents,
});
