import type { CSSProperties } from "react";
import type { DemoRole } from "./demo-data";

export function LeafIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path
        d="M41 6C22.6 7.4 10.5 15.8 8 31.2c8.7 1.2 25.1-3.7 33-25.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M8 39C16.6 26 25.8 18.4 36.2 12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M19.2 5.2a5.1 5.1 0 0 0-7.2 0l-.5.5-.5-.5a5.1 5.1 0 0 0-7.2 7.2l7.7 7.7 7.7-7.7a5.1 5.1 0 0 0 0-7.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function HandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M8.5 12.4V5.8a1.4 1.4 0 0 1 2.8 0v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M11.3 11.8V4.5a1.4 1.4 0 0 1 2.8 0V12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.1 12V6a1.4 1.4 0 0 1 2.8 0v7.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 9.5A1.4 1.4 0 0 0 5.7 10v4.2c0 4.4 2.8 7.3 7.2 7.3 4 0 6.5-2.7 6.5-6.7V9.1a1.4 1.4 0 0 0-2.8 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M8.4 11.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.2 11.2a2.7 2.7 0 1 0 0-5.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M3.5 19.2v-.8c0-2.5 2.1-4.5 4.9-4.5s4.9 2 4.9 4.5v.8M13.5 14.2c2.4.2 4 2 4 4.2v.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="m4 8.4 2.3 2.3L12 5.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M5 7V5.4a3 3 0 0 1 6 0V7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M4.4 7h7.2v6H4.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 3.4 19 6v5.2c0 4.4-2.8 7.2-7 8.9-4.2-1.7-7-4.5-7-8.9V6l7-2.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 8v6M9 11h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 12h15M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function BackArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function SpinnerIcon() {
  return (
    <svg aria-hidden="true" className="animate-spin" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeDasharray="3 5"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function RoleIcon({ icon }: { icon: DemoRole["icon"] }) {
  if (icon === "heart") {
    return <HeartIcon />;
  }

  if (icon === "hand") {
    return <HandIcon />;
  }

  return <PeopleIcon />;
}

export function DemoMotionStyles() {
  return (
    <style>{`
      @keyframes demoFadeUp {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes demoFadeDown {
        from {
          opacity: 0;
          transform: translateY(-12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes demoFadeRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes demoLeafDrift {
        0%, 100% {
          transform: translate3d(0, 0, 0) rotate(var(--demo-rotate, 0deg));
        }
        50% {
          transform: translate3d(0, -8px, 0) rotate(calc(var(--demo-rotate, 0deg) + 1deg));
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .demo-enter-up,
        .demo-enter-down,
        .demo-enter-right {
          opacity: 0;
          animation-duration: 620ms;
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }

        .demo-enter-up {
          animation-name: demoFadeUp;
        }

        .demo-enter-down {
          animation-name: demoFadeDown;
        }

        .demo-enter-right {
          animation-name: demoFadeRight;
        }

        .demo-leaf-drift {
          animation: demoLeafDrift 8s ease-in-out infinite;
          transform-origin: center;
        }

        .demo-card-delay-1 {
          animation-delay: 140ms;
        }

        .demo-card-delay-2 {
          animation-delay: 220ms;
        }

        .demo-card-delay-3 {
          animation-delay: 300ms;
        }
      }

      @media (min-width: 1280px) and (max-height: 820px) {
        .demo-header {
          padding-top: 1rem;
          padding-bottom: 1rem;
        }

        .demo-brand {
          font-size: 2.2rem;
        }

        .demo-brand-mark {
          height: 1.7rem;
          width: 1.7rem;
        }

        .demo-back-link {
          min-height: 2.5rem;
          padding-left: 1.1rem;
          padding-right: 1.1rem;
        }

        .demo-shell {
          min-height: calc(100vh - 4.7rem);
          padding-bottom: 1rem;
          row-gap: 0.7rem;
        }

        .demo-hero {
          padding-left: 5.1rem;
        }

        .demo-eyebrow {
          margin-bottom: 0.45rem;
          font-size: 0.82rem;
        }

        .demo-title {
          max-width: 16ch;
          font-size: clamp(3rem, 4vw, 4.75rem);
          line-height: 0.9;
        }

        .demo-lede {
          margin-top: 0.75rem;
          max-width: 28rem;
          font-size: 1.05rem;
          line-height: 1.55;
        }

        .demo-roles {
          gap: 1rem;
          padding-left: 5.1rem;
        }

        .demo-role-card {
          min-height: 16.7rem;
        }

        .demo-role-image {
          height: 78%;
          width: 50%;
        }

        .demo-role-icon {
          top: 1.05rem;
          left: 1.05rem;
          height: 3rem;
          width: 3rem;
        }

        .demo-role-icon-inner {
          height: 1.45rem;
          width: 1.45rem;
        }

        .demo-selected-pill {
          top: 1rem;
          right: 1rem;
          padding: 0.38rem 0.65rem;
          font-size: 0.76rem;
        }

        .demo-role-copy {
          margin-top: 4.7rem;
          padding-left: 1.1rem;
          padding-right: 1.1rem;
        }

        .demo-role-title {
          font-size: 1.85rem;
        }

        .demo-role-divider,
        .demo-role-description {
          margin-top: 0.75rem;
        }

        .demo-role-description {
          max-width: 11rem;
          font-size: 0.95rem;
          line-height: 1.35;
        }

        .demo-role-account {
          padding: 0 1.1rem 1rem;
        }

        .demo-role-account-label {
          font-size: 0.66rem;
        }

        .demo-role-account-pill {
          margin-top: 0.38rem;
          padding: 0.42rem 0.55rem;
          font-size: 0.78rem;
        }

        .demo-actions {
          gap: 0.85rem;
        }

        .demo-action-grid {
          gap: 0.85rem;
        }

        .demo-submit,
        .demo-status {
          min-height: 3.3rem;
          font-size: 1rem;
        }

        .demo-submit {
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }

        .demo-status {
          padding-left: 1.2rem;
          padding-right: 1.2rem;
        }

        .demo-note {
          margin-top: 0.55rem;
          padding-left: 8.5rem;
          font-size: 0.8rem;
        }

        .demo-error {
          margin-top: 1rem;
          padding: 1rem;
        }

        .demo-aside {
          margin-top: 3.2rem;
          padding: 1.15rem;
        }

        .demo-aside-title {
          margin-bottom: 1rem;
          font-size: 0.78rem;
        }

        .demo-steps {
          gap: 1rem;
        }

        .demo-step {
          grid-template-columns: 2rem 1fr;
          gap: 0.75rem;
        }

        .demo-step-line {
          left: 1rem;
          top: 2.45rem;
          height: 2.15rem;
        }

        .demo-step-number {
          height: 2rem;
          width: 2rem;
          font-size: 0.82rem;
        }

        .demo-step-title {
          font-size: 0.95rem;
        }

        .demo-step-body {
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .demo-secure-box {
          margin-top: 1.2rem;
          padding: 1rem;
        }

        .demo-secure-copy {
          margin-top: 0.45rem;
          font-size: 0.78rem;
          line-height: 1.35;
        }
      }
    `}</style>
  );
}

export function BackgroundOrnaments() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(199,224,189,0.34),transparent_24rem),radial-gradient(circle_at_82%_86%,rgba(255,200,77,0.14),transparent_24rem)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#12351f_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none absolute right-[-7rem] top-[-5rem] h-[30rem] w-[46rem] rotate-[-10deg] rounded-[50%] border border-[#b7c8aa]/35 opacity-60" />
      <div className="pointer-events-none absolute right-[11rem] top-0 h-80 w-[32rem] opacity-[0.08] [background-image:linear-gradient(24deg,#12351f_1px,transparent_1px),linear-gradient(114deg,#12351f_1px,transparent_1px)] [background-size:42px_42px]" />
      <svg
        aria-hidden="true"
        className="demo-leaf-drift pointer-events-none absolute bottom-[-3rem] left-[-4rem] !h-[34rem] !w-[27rem] text-[#88a981] opacity-30"
        style={{ "--demo-rotate": "-3deg" } as CSSProperties}
        viewBox="0 0 320 420"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        >
          <path d="M46 405C88 295 126 197 235 64" />
          <path d="M88 303C64 268 46 231 51 187c45 18 69 54 68 109" />
          <path d="M132 245c-32-33-48-70-42-111 47 15 76 48 82 101" />
          <path d="M181 186c-28-39-34-79-18-120 42 24 63 64 56 112" />
          <path d="M86 307c35-6 69 3 99 26-37 22-77 20-119-4" />
          <path d="M128 246c38-9 76-2 110 23-39 27-83 27-133 2" />
          <path d="M177 188c35-10 68-5 100 17-32 26-70 29-115 7" />
        </g>
      </svg>
      <svg
        aria-hidden="true"
        className="demo-leaf-drift pointer-events-none absolute left-[-1.5rem] top-[48%] hidden !h-[19rem] !w-[13rem] text-[#88a981] opacity-34 lg:block"
        style={{ "--demo-rotate": "-18deg" } as CSSProperties}
        viewBox="0 0 180 300"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.15"
        >
          <path d="M27 287C55 205 77 122 134 22" />
          <path d="M58 203C35 176 23 146 27 111c35 13 55 41 56 84" />
          <path d="M81 143C56 119 44 91 49 58c37 11 59 37 63 77" />
          <path d="M50 220c31-8 59-2 84 18-32 19-66 17-101-4" />
          <path d="M79 146c33-9 64-4 93 17-34 23-70 22-110 1" />
        </g>
      </svg>
      <svg
        aria-hidden="true"
        className="demo-leaf-drift pointer-events-none absolute right-[-2rem] top-[5rem] !h-[30rem] !w-[15rem] text-[#9fb996] opacity-34"
        style={{ "--demo-rotate": "0deg" } as CSSProperties}
        viewBox="0 0 180 360"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.1"
        >
          <path d="M129 350C105 240 93 154 119 28" />
          <path d="M113 241c-36-21-57-49-64-84 43 2 71 25 83 68" />
          <path d="M119 198c23-38 48-62 77-73-2 44-24 75-65 94" />
          <path d="M115 126c-30-19-49-44-56-74 39 3 64 24 76 62" />
        </g>
      </svg>
      <svg
        aria-hidden="true"
        className="demo-leaf-drift pointer-events-none absolute bottom-[-1rem] right-[-1rem] hidden !h-[16rem] !w-[16rem] text-[#9bb791] opacity-28 xl:block"
        style={{ "--demo-rotate": "8deg" } as CSSProperties}
        viewBox="0 0 220 220"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.15"
        >
          <path d="M153 213C125 156 91 97 26 26" />
          <path d="M79 103C51 98 29 84 14 60c32-9 58 0 78 28" />
          <path d="M105 133c-31 2-57-7-78-28 29-17 58-14 87 8" />
          <path d="M129 164c-28 7-54 2-78-16 25-21 54-24 87-4" />
          <path d="M98 94c5-29 19-51 43-66 8 32-2 58-31 78" />
          <path d="M126 129c10-30 28-51 54-63 3 35-12 62-44 79" />
        </g>
      </svg>
    </>
  );
}

export function HeroSprig() {
  return (
    <svg
      aria-hidden="true"
      className="demo-leaf-drift pointer-events-none absolute left-[clamp(34rem,46vw,46rem)] top-2 hidden !h-24 !w-24 text-[#6f9367] opacity-70 lg:block xl:!h-28 xl:!w-28"
      style={{ "--demo-rotate": "-12deg" } as CSSProperties}
      viewBox="0 0 90 90"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      >
        <path d="M10 73c20-18 35-39 45-63" />
        <path d="M34 42c-12-8-18-18-16-31 14 7 21 17 20 31" />
        <path d="M47 25c10-7 18-15 24-24 4 16-2 28-19 37" />
        <path d="M24 56c-10-6-17-14-20-25 15 2 24 10 27 24" />
      </g>
    </svg>
  );
}
