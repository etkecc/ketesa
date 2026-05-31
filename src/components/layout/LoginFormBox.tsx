import { Box, BoxProps, keyframes } from "@mui/material";
import { styled } from "@mui/material/styles";

interface LoginFormBoxProps extends BoxProps {
  backgroundUrl: string;
}

const float1 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(60px, -40px) scale(1.1); }
  50% { transform: translate(-30px, 60px) scale(0.95); }
  75% { transform: translate(40px, 30px) scale(1.05); }
`;

const float2 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-50px, 50px) scale(1.08); }
  66% { transform: translate(70px, -20px) scale(0.92); }
`;

const float3 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  20% { transform: translate(40px, 50px) scale(1.12); }
  40% { transform: translate(-60px, 20px) scale(0.9); }
  60% { transform: translate(20px, -50px) scale(1.05); }
  80% { transform: translate(-30px, -30px) scale(0.95); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
`;

const LoginFormBox = styled(Box, {
  shouldForwardProp: prop => prop !== "backgroundUrl",
})<LoginFormBoxProps>(({ theme, backgroundUrl }) => {
  const isDark = theme.palette.mode === "dark";
  const hasCustomBg = backgroundUrl !== "";

  const baseBg = isDark ? "#0C1318" : "#F0F2F5";

  return {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
    overflow: "hidden",
    background: hasCustomBg ? `url(${backgroundUrl})` : baseBg,
    backgroundColor: isDark ? theme.palette.background.default : theme.palette.background.paper,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center",

    // Orbs layer — only shown when no custom background
    ...(!hasCustomBg && {
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: [
          // Large primary orb — top-left
          `radial-gradient(circle 320px at 15% 25%, ${isDark ? "rgba(244,147,0,0.15)" : "rgba(24,88,213,0.12)"} 0%, transparent 70%)`,
          // Medium accent orb — bottom-right
          `radial-gradient(circle 250px at 80% 75%, ${isDark ? "rgba(244,147,0,0.10)" : "rgba(244,147,0,0.08)"} 0%, transparent 70%)`,
          // Small secondary orb — top-right
          `radial-gradient(circle 200px at 75% 20%, ${isDark ? "rgba(244,147,0,0.08)" : "rgba(24,88,213,0.06)"} 0%, transparent 70%)`,
          // Subtle warm orb — bottom-left
          `radial-gradient(circle 280px at 25% 80%, ${isDark ? "rgba(244,147,0,0.06)" : "rgba(24,88,213,0.05)"} 0%, transparent 70%)`,
        ].join(", "),
        animation: `${float1} 20s ease-in-out infinite`,
      },
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: [
          // Drifting orange orb — center-left
          `radial-gradient(circle 220px at 35% 55%, ${isDark ? "rgba(244,147,0,0.10)" : "rgba(24,88,213,0.08)"} 0%, transparent 70%)`,
          // Drifting orange orb — center-right
          `radial-gradient(circle 180px at 65% 45%, ${isDark ? "rgba(244,147,0,0.08)" : "rgba(244,147,0,0.06)"} 0%, transparent 70%)`,
          // Small accent — bottom-center
          `radial-gradient(circle 150px at 50% 85%, ${isDark ? "rgba(255,192,96,0.06)" : "rgba(217,119,6,0.04)"} 0%, transparent 70%)`,
        ].join(", "),
        animation: `${float2} 25s ease-in-out infinite, ${pulse} 8s ease-in-out infinite`,
      },
    }),

    // Animated orb elements (children with .orb class)
    [`& .login-orb`]: {
      position: "absolute",
      borderRadius: "50%",
      filter: `blur(${isDark ? "80px" : "60px"})`,
      zIndex: 0,
      pointerEvents: "none",
    },
    [`& .login-orb-1`]: {
      width: "400px",
      height: "400px",
      top: "-5%",
      right: "-5%",
      background: isDark ? "rgba(244,147,0,0.12)" : "rgba(24,88,213,0.10)",
      animation: `${float3} 22s ease-in-out infinite`,
    },
    [`& .login-orb-2`]: {
      width: "300px",
      height: "300px",
      bottom: "10%",
      left: "-3%",
      background: isDark ? "rgba(244,147,0,0.10)" : "rgba(244,147,0,0.07)",
      animation: `${float1} 18s ease-in-out infinite reverse`,
    },
    [`& .login-orb-3`]: {
      width: "250px",
      height: "250px",
      top: "40%",
      right: "20%",
      background: isDark ? "rgba(244,147,0,0.06)" : "rgba(24,88,213,0.05)",
      animation: `${float2} 30s ease-in-out infinite`,
    },

    [`& .card`]: {
      position: "relative",
      zIndex: 1,
      width: "30rem",
      marginTop: "6rem",
      marginBottom: "6rem",
      backdropFilter: "blur(16px)",
      backgroundColor: isDark ? "rgba(21, 28, 36, 0.75)" : "rgba(255, 255, 255, 0.80)",
      boxShadow: isDark
        ? "0 0 30px rgba(244, 147, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)"
        : "0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
      border: isDark ? "1px solid rgba(244, 147, 0, 0.18)" : "1px solid rgba(229, 231, 235, 0.8)",
    },
    [`@media (max-width: 600px)`]: {
      [`& .card`]: {
        width: "100%",
        marginTop: "0",
        marginBottom: "2rem",
      },
    },
    // Reserve the logo's footprint and centre vertically, so swapping to the
    // (much smaller) loading spinner on submit doesn't collapse the avatar row
    // and jump the whole card upward.
    [`& .avatar`]: {
      margin: "1.5rem 1rem 1rem",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "80px",
      [theme.breakpoints.up("sm")]: {
        minHeight: "120px",
      },
    },
    [`& .icon`]: {
      backgroundColor: theme.palette.grey[500],
    },
    [`& .hint`]: {
      marginTop: "0.5em",
      marginBottom: "1.5em",
      display: "flex",
      justifyContent: "center",
      color: theme.palette.text.secondary,
      fontSize: "1.05rem",
      fontWeight: 500,
    },
    [`& .form`]: {
      padding: "0 1.5rem 1.5rem 1.5rem",
    },
    // Buttons live inside .form (which already supplies the 1.5rem horizontal
    // padding), so .actions adds none of its own — otherwise the buttons sit
    // inset from the inputs above them and the column looks misaligned.
    [`& .actions`]: {
      padding: 0,
      marginTop: "0.5rem",
    },
    // Probe status line (resolving / unreachable / incompatible / suppress).
    // Colour is set per-message on the Typography (error vs secondary), so it is
    // deliberately omitted here to avoid overriding the error variants.
    [`& .serverState`]: {
      fontSize: "0.85rem",
      marginLeft: "0.5rem",
      // Padding, not margin: it stays inside the Collapse's measured height box,
      // so the status line animates in/out cleanly instead of snapping at the
      // first frame of the transition.
      paddingTop: "0.25rem",
      paddingBottom: "0.75rem",
    },
    [`& .serverVersion`]: {
      color: theme.palette.text.secondary,
      fontSize: "0.85rem",
      marginLeft: "0.5rem",
    },
    [`& .matrixVersions`]: {
      color: theme.palette.text.secondary,
      fontSize: "0.8rem",
      marginBottom: "1rem",
      marginLeft: "0.5rem",
    },
  };
});

export default LoginFormBox;
