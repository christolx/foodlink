"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { Suspense, useEffect, useState } from "react";
import type { UserRole } from "@/lib/api";
import { demoLogin, getMyProfile } from "@/lib/session";

type DemoRole = {
  role: UserRole;
  title: string;
  account: string;
  description: string;
  icon: "heart" | "hand" | "people";
  image: string;
  accent: "leaf" | "sun" | "mint";
};

function LeafIcon() {
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

function HeartIcon() {
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

function HandIcon() {
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

function PeopleIcon() {
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

function CheckIcon() {
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

function LockIcon() {
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

function ShieldIcon() {
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

function ArrowIcon() {
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

function BackArrowIcon() {
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

function SpinnerIcon() {
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

function RoleIcon({ icon }: { icon: DemoRole["icon"] }) {
  if (icon === "heart") {
    return <HeartIcon />;
  }

  if (icon === "hand") {
    return <HandIcon />;
  }

  return <PeopleIcon />;
}

function DemoMotionStyles() {
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
    `}</style>
  );
}

function BackgroundOrnaments() {
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

function HeroSprig() {
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

const roles: DemoRole[] = [
  {
    role: "donor",
    title: "Donor",
    account: "donor@foodlink.local",
    description: "I have surplus food to share with my community.",
    icon: "heart",
    image: "/demo/roles/donor-role.webp",
    accent: "leaf",
  },
  {
    role: "volunteer",
    title: "Volunteer",
    account: "volunteer@foodlink.local",
    description: "I help collect and deliver food to those in need.",
    icon: "hand",
    image: "/demo/roles/volunteer-role.webp",
    accent: "mint",
  },
  {
    role: "receiver",
    title: "Receiver",
    account: "receiver@foodlink.local",
    description: "I represent an organization that receives food.",
    icon: "people",
    image: "/demo/roles/receiver-role.webp",
    accent: "sun",
  },
];

const accentClasses = {
  leaf: "bg-[#0f4f24] text-[#fffdf5]",
  mint: "bg-[#dcebd5] text-[#0f4f24]",
  sun: "bg-[#f7dfaa] text-[#0f1b14]",
};

function parseDemoRole(role: string | null): UserRole | null {
  if (role === "donor" || role === "receiver" || role === "volunteer") {
    return role;
  }

  return null;
}

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoPageContent />
    </Suspense>
  );
}

function DemoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("selectedRole");
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    () => parseDemoRole(roleParam) ?? "donor",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextRole = parseDemoRole(roleParam);

    if (nextRole) {
      setSelectedRole(nextRole);
    }
  }, [roleParam]);

  async function handleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await demoLogin(selectedRole);
      await getMyProfile(response.accessToken);
      router.replace("/app");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Demo API unavailable. Check backend and try again.",
      );
      setIsLoading(false);
    }
  }

  const selected = roles.find((role) => role.role === selectedRole) ?? roles[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f5ea] text-[#0d1b13]">
      <DemoMotionStyles />
      <BackgroundOrnaments />

      <header className="demo-enter-down relative z-10 mx-auto flex w-[min(94vw,1510px)] items-center justify-between px-2 py-8 md:py-10">
        <Link
          className="inline-flex items-center gap-3 font-serif text-[2.15rem] leading-none text-[#071f10] md:text-[2.75rem]"
          href="/"
        >
          <span className="h-8 w-8 text-[#ffb51b]" aria-hidden="true">
            <LeafIcon />
          </span>
          FoodLink
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-transparent bg-transparent px-4 font-black text-[#14351f] transition hover:-translate-y-0.5 hover:bg-[#fffdf5]/70 hover:shadow-sm md:border-[#c7c0ab] md:px-6"
          href="/"
        >
          <span className="h-4 w-4" aria-hidden="true">
            <BackArrowIcon />
          </span>
          Back to home
        </Link>
      </header>

      <section
        className="relative z-10 mx-auto grid min-h-[calc(100vh-8.5rem)] w-[min(94vw,1510px)] items-start gap-x-8 gap-y-4 px-2 pb-12 pt-0 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-x-14"
        aria-labelledby="demo-title"
      >
        <div
          className="demo-enter-up relative max-w-3xl xl:pl-[6.8rem]"
          style={{ animationDelay: "80ms" }}
        >
          <HeroSprig />
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#2f7a46] md:text-base">
            Demo login
          </p>
          <h1
            id="demo-title"
            className="max-w-[14ch] font-serif text-[clamp(3.55rem,5.05vw,6.15rem)] leading-[0.92] tracking-[-0.045em] text-[#041f0e]"
          >
            Choose your role to get started
          </h1>
          <p className="mt-5 max-w-[30rem] text-lg font-bold leading-8 text-[#34443a] md:text-xl">
            Jump into a seeded demo account. Explore the experience as a donor,
            volunteer, or receiver.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 xl:pl-[6.3rem]">
          {roles.map((role, index) => {
            const isSelected = role.role === selectedRole;

            return (
              <button
                className={`demo-enter-up demo-card-delay-${index + 1} group relative grid min-h-[22rem] overflow-hidden rounded-[0.7rem] border text-left shadow-[0_1.4rem_3.4rem_rgba(61,55,36,0.11)] transition duration-300 hover:-translate-y-1 md:min-h-[23rem] xl:min-h-[21.9rem] ${
                  isSelected
                    ? "border-[#f5b51e] bg-[#062f14] text-[#fffdf5] ring-1 ring-[#f5b51e]/80 shadow-[0_1.5rem_3.2rem_rgba(61,42,5,0.22)]"
                    : "border-[#d8cdb7] bg-[#fffdf7]/72 text-[#0e1b14] hover:border-[#b5ad98]"
                }`}
                type="button"
                key={role.role}
                onClick={() => setSelectedRole(role.role)}
                aria-pressed={isSelected}
              >
                <Image
                  className={`absolute bottom-0 right-0 h-[82%] w-[54%] object-cover object-right-bottom transition duration-300 group-hover:scale-105 ${
                    isSelected ? "opacity-58 mix-blend-screen" : "opacity-90"
                  }`}
                  src={role.image}
                  alt=""
                  width={500}
                  height={660}
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 26%), linear-gradient(180deg, transparent 0%, black 18%)",
                    WebkitMaskComposite: "source-in",
                    maskComposite: "intersect",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 26%), linear-gradient(180deg, transparent 0%, black 18%)",
                  }}
                />
                <span
                  className={`pointer-events-none absolute inset-0 ${
                    isSelected
                      ? "bg-gradient-to-br from-[#062f14] via-[#062f14]/88 to-[#062f14]/22"
                      : "bg-gradient-to-r from-[#fffdf7] via-[#fffdf7]/92 to-[#fffdf7]/16"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`absolute left-6 top-6 grid h-14 w-14 place-items-center rounded-full border text-3xl md:h-16 md:w-16 ${
                    isSelected
                      ? "border-[#ffca39] bg-transparent text-[#ffca39]"
                      : `${accentClasses[role.accent]} border-transparent`
                  }`}
                  aria-hidden="true"
                >
                  <span className="h-8 w-8">
                    <RoleIcon icon={role.icon} />
                  </span>
                </span>
                {isSelected ? (
                  <span className="absolute right-5 top-6 inline-flex items-center gap-2 rounded-full bg-[#233f17]/72 px-3 py-2 text-xs font-black text-[#ffca39] md:text-sm">
                    Selected
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ffca39] text-[#17310e]">
                      <CheckIcon />
                    </span>
                  </span>
                ) : null}
                <span className="relative z-10 mt-24 block px-6 md:mt-28">
                  <strong className="block font-serif text-[2rem] font-normal leading-none md:text-[2.25rem]">
                    {role.title}
                  </strong>
                  <span
                    className={`mt-5 block h-px w-24 ${
                      isSelected ? "bg-[#ffca39]" : "bg-[#89b476]"
                    }`}
                  />
                  <span className="mt-5 block max-w-[11.5rem] text-base font-bold leading-7 md:text-lg">
                    {role.description}
                  </span>
                </span>
                <span className="relative z-10 self-end px-6 pb-6">
                  <span className="block text-xs font-black uppercase tracking-[0.12em] opacity-70">
                    Seeded account
                  </span>
                  <span
                    className={`mt-2 inline-flex rounded-lg px-3 py-2 text-sm font-black ${
                      isSelected
                        ? "bg-white/10 text-[#fffdf5]"
                        : "bg-[#e8efe1] text-[#244633]"
                    }`}
                  >
                    {role.account}
                  </span>
                </span>
              </button>
            );
          })}

          <div
            className="demo-enter-up md:col-span-3"
            style={{ animationDelay: "390ms" }}
          >
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem] md:items-center">
              <button
                className="group inline-flex min-h-16 items-center justify-center rounded-[0.55rem] bg-gradient-to-b from-[#ffc733] to-[#f5a51e] px-8 text-lg font-black text-[#171206] shadow-[0_1.4rem_2.8rem_rgba(116,72,3,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
              >
                <span className="flex-1 text-center">
                  {isLoading
                    ? "Signing in..."
                    : `Continue as ${selected.title}`}
                </span>
                <span
                  className="h-5 w-5 transition duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <ArrowIcon />
                </span>
              </button>
              <div className="inline-flex min-h-16 items-center justify-center gap-4 rounded-[0.55rem] border border-[#bfc5ad] bg-[#fffdf5]/66 px-8 text-lg font-black text-[#153821]">
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 text-[#153821]" aria-hidden="true">
                      <SpinnerIcon />
                    </span>
                    Signing in...
                  </>
                ) : (
                  "Ready"
                )}
              </div>
            </div>
            <p className="mt-3 inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-[#5a6259] md:justify-start md:pl-[12.5rem]">
              <span className="h-4 w-4 text-[#456a4e]" aria-hidden="true">
                <LockIcon />
              </span>
              No password needed. Demo account connects to live API.
            </p>
            {error ? (
              <div className="mt-7 flex items-start justify-between gap-4 rounded-[0.55rem] border border-[#f0a59b] bg-[#fff0eb]/88 p-5 text-[#80251d] shadow-[0_1rem_2.2rem_rgba(94,35,24,0.06)]">
                <div className="flex items-start gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4453f] text-white">
                    !
                  </span>
                  <span>
                    <strong className="block font-black">
                      Demo API unavailable
                    </strong>
                    <span className="mt-1 block font-bold">{error}</span>
                  </span>
                </div>
                <button
                  className="rounded-[0.45rem] border border-[#e77464] bg-[#fff8f3] px-5 py-3 font-black text-[#c33b32]"
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <aside
          className="demo-enter-right rounded-[0.8rem] bg-[#fffdf7]/88 p-7 shadow-[0_1.8rem_4rem_rgba(61,55,36,0.12)] backdrop-blur xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-[4.8rem]"
          style={{ animationDelay: "260ms" }}
          aria-label="Demo login status"
        >
          <p className="mb-7 text-sm font-black uppercase tracking-[0.14em] text-[#28623a]">
            Your journey
          </p>
          <ol className="grid gap-7">
            {[
              ["Choose role", "Select how you want to participate"],
              ["Sign in", "We'll sign you in with a demo account"],
              ["Load profile", "Your profile and data will be loaded"],
              ["Open dashboard", "You'll land in your role dashboard"],
            ].map(([title, body], index) => {
              const active = index === 0 || (isLoading && index === 1);

              return (
                <li
                  className="relative grid grid-cols-[2.5rem_1fr] gap-4"
                  key={title}
                >
                  {index < 3 ? (
                    <span
                      className="absolute left-5 top-11 h-[3.15rem] border-l-2 border-dashed border-[#c5d3bb]"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={`relative z-10 grid h-10 w-10 place-items-center rounded-full font-black ${
                      active
                        ? "bg-[#0f4f24] text-white"
                        : "bg-[#d7e7cf] text-[#14351f]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <strong className="block text-base font-black text-[#14351f] md:text-lg">
                      {title}
                    </strong>
                    <small className="mt-1 block text-sm font-semibold leading-6 text-[#5a6259] md:text-base">
                      {body}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-9 grid grid-cols-[1.65rem_1fr] gap-3 rounded-[0.7rem] bg-[#eef5e9] p-5">
            <span className="h-6 w-6 text-[#28623a]" aria-hidden="true">
              <ShieldIcon />
            </span>
            <span>
              <strong className="block font-black text-[#28623a]">
                Secure demo
              </strong>
              <span className="mt-2 block text-sm font-semibold leading-6 text-[#5a6259]">
                No password needed. Connections are secure and temporary.
              </span>
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}
