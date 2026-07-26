"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { UserRole } from "@/lib/api";
import { imageBlurDataUrls } from "@/lib/image-placeholders";
import { demoLogin, getMyProfile } from "@/lib/session";
import { ProgressiveImage } from "../_components/ProgressiveImage";
import {
  ArrowIcon,
  BackArrowIcon,
  BackgroundOrnaments,
  CheckIcon,
  DemoMotionStyles,
  HeroSprig,
  LeafIcon,
  LockIcon,
  RoleIcon,
  ShieldIcon,
  SpinnerIcon,
} from "./_components/DemoIcons";
import { accentClasses, parseDemoRole, roles } from "./_data/roles";

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

      <header className="demo-header demo-enter-down relative z-10 mx-auto flex w-[min(92vw,1510px)] items-center justify-between px-1 py-5 md:w-[min(94vw,1510px)] md:px-2 md:py-10">
        <Link
          className="demo-brand inline-flex items-center gap-2 font-serif text-[1.9rem] leading-none text-[#071f10] md:gap-3 md:text-[2.75rem]"
          href="/"
        >
          <span
            className="demo-brand-mark h-7 w-7 text-[#ffb51b] md:h-8 md:w-8"
            aria-hidden="true"
          >
            <LeafIcon />
          </span>
          FoodLink
        </Link>
        <Link
          className="demo-back-link inline-flex min-h-10 items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 font-black text-[#14351f] transition hover:-translate-y-0.5 hover:bg-[#fffdf5]/70 hover:shadow-sm md:min-h-11 md:gap-3 md:border-[#c7c0ab] md:px-6"
          href="/"
        >
          <span className="h-4 w-4" aria-hidden="true">
            <BackArrowIcon />
          </span>
          <span className="md:hidden">Home</span>
          <span className="hidden md:inline">Back to home</span>
        </Link>
      </header>

      <section
        className="demo-shell relative z-10 mx-auto grid min-h-[calc(100dvh-5.5rem)] w-[min(92vw,1510px)] items-start gap-x-8 gap-y-4 px-1 pb-8 pt-0 md:min-h-[calc(100dvh-8.5rem)] md:w-[min(94vw,1510px)] md:px-2 md:pb-12 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-x-14"
        aria-labelledby="demo-title"
      >
        <div
          className="demo-hero demo-enter-up relative max-w-3xl xl:pl-[6.8rem]"
          style={{ animationDelay: "80ms" }}
        >
          <HeroSprig />
          <p className="demo-eyebrow mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#2f7a46] md:mb-3 md:text-base">
            Demo login
          </p>
          <h1
            id="demo-title"
            className="demo-title max-w-[10ch] font-serif text-[clamp(3rem,13vw,3.55rem)] leading-[0.9] tracking-[-0.045em] text-[#041f0e] md:max-w-[14ch] md:text-[clamp(3.55rem,5.05vw,6.15rem)] md:leading-[0.92]"
          >
            Choose your role
          </h1>
          <p className="demo-lede mt-3 max-w-[22rem] text-base font-bold leading-7 text-[#34443a] md:mt-5 md:max-w-[30rem] md:text-xl md:leading-8">
            Try a seeded account. No password needed.
          </p>
        </div>

        <div className="demo-roles grid gap-3 md:grid-cols-3 md:gap-6 xl:pl-[6.3rem]">
          {roles.map((role, index) => {
            const isSelected = role.role === selectedRole;

            return (
              <button
                className={`demo-role-card demo-enter-up demo-card-delay-${index + 1} group relative grid overflow-hidden rounded-[0.85rem] border text-left shadow-[0_1rem_2.2rem_rgba(61,55,36,0.08)] transition duration-300 hover:-translate-y-1 md:min-h-[23rem] md:rounded-[0.7rem] md:shadow-[0_1.4rem_3.4rem_rgba(61,55,36,0.11)] xl:min-h-[21.9rem] ${
                  isSelected
                    ? "min-h-[16.6rem] border-[#f5b51e] bg-[#062f14] text-[#fffdf5] ring-1 ring-[#f5b51e]/80 shadow-[0_1.3rem_2.8rem_rgba(61,42,5,0.18)] md:min-h-[23rem] md:shadow-[0_1.5rem_3.2rem_rgba(61,42,5,0.22)] xl:min-h-[21.9rem]"
                    : "min-h-[6rem] border-[#d8cdb7] bg-[#fffdf7]/76 text-[#0e1b14] hover:border-[#b5ad98] md:min-h-[23rem] xl:min-h-[21.9rem]"
                }`}
                type="button"
                key={role.role}
                onClick={() => setSelectedRole(role.role)}
                aria-pressed={isSelected}
              >
                <span
                  className={`demo-role-image absolute bottom-0 right-0 object-cover object-right-bottom transition duration-300 group-hover:scale-105 md:h-[82%] md:w-[54%] ${
                    isSelected
                      ? "h-[76%] w-[50%] opacity-50 mix-blend-screen"
                      : "h-full w-[27%] opacity-26 md:opacity-90"
                  }`}
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 26%), linear-gradient(180deg, transparent 0%, black 18%)",
                    WebkitMaskComposite: "source-in",
                    maskComposite: "intersect",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 26%), linear-gradient(180deg, transparent 0%, black 18%)",
                  }}
                >
                  <ProgressiveImage
                    src={role.image}
                    alt=""
                    fill
                    className="object-cover object-right-bottom"
                    blurDataURL={imageBlurDataUrls[role.image]}
                    fadeDuration={250}
                    sizes="(max-width: 767px) 50vw, 27vw"
                  />
                </span>
                <span
                  className={`pointer-events-none absolute inset-0 ${
                    isSelected
                      ? "bg-gradient-to-br from-[#062f14] via-[#062f14]/88 to-[#062f14]/22"
                      : "bg-gradient-to-r from-[#fffdf7] via-[#fffdf7]/94 to-[#fffdf7]/34 md:to-[#fffdf7]/16"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`demo-role-icon absolute grid place-items-center rounded-full border leading-none text-3xl md:left-6 md:top-6 md:h-16 md:w-16 ${
                    isSelected
                      ? "left-5 top-5 h-12 w-12 border-[#ffca39] bg-transparent text-[#ffca39] md:h-16 md:w-16"
                      : `left-4 top-1/2 h-12 w-12 -translate-y-1/2 ${accentClasses[role.accent]} border-transparent md:translate-y-0`
                  }`}
                  aria-hidden="true"
                >
                  <span className="demo-role-icon-inner block h-6 w-6 md:h-8 md:w-8 [&_svg]:block [&_svg]:h-full [&_svg]:w-full">
                    <RoleIcon icon={role.icon} />
                  </span>
                </span>
                {isSelected ? (
                  <span className="demo-selected-pill absolute right-4 top-5 inline-flex items-center gap-2 rounded-full bg-[#233f17]/72 px-3 py-2 text-xs font-black text-[#ffca39] md:right-5 md:top-6 md:text-sm">
                    Selected
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ffca39] text-[#17310e]">
                      <CheckIcon />
                    </span>
                  </span>
                ) : null}
                <span
                  className={`demo-role-copy relative z-10 block md:mt-28 md:px-6 ${
                    isSelected
                      ? "mt-[4.85rem] px-5"
                      : "ml-[4.65rem] flex h-full flex-col justify-center px-0 pr-[6.35rem] md:ml-0 md:block md:h-auto md:px-6 md:pr-6"
                  }`}
                >
                  <strong className="demo-role-title block font-serif text-[1.55rem] font-normal leading-none md:text-[2.25rem]">
                    {role.title}
                  </strong>
                  <span
                    className={`demo-role-divider mt-3 h-px w-20 md:mt-5 md:block md:w-24 ${
                      isSelected ? "bg-[#ffca39]" : "bg-[#89b476]"
                    } ${isSelected ? "block" : "hidden"}`}
                  />
                  <span
                    className={`demo-role-description block font-bold md:mt-5 md:max-w-[11.5rem] md:text-lg md:leading-7 ${
                      isSelected
                        ? "mt-3 max-w-[14.25rem] text-base leading-6"
                        : "mt-1 max-w-[14.5rem] text-sm leading-5 text-[#34443a] md:text-[#0e1b14]"
                    }`}
                  >
                    {role.description}
                  </span>
                </span>
                <span
                  className={`demo-role-account relative z-10 self-end px-5 pb-4 md:block md:px-6 md:pb-6 ${
                    isSelected ? "block" : "hidden"
                  }`}
                >
                  <span className="demo-role-account-label block text-[0.68rem] font-black uppercase tracking-[0.12em] opacity-70 md:text-xs">
                    Seeded account
                  </span>
                  <span
                    className={`demo-role-account-pill mt-2 inline-flex rounded-lg px-3 py-2 text-xs font-black leading-none md:text-sm ${
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
            className="demo-actions demo-enter-up mt-2 md:col-span-3 md:mt-0"
            style={{ animationDelay: "390ms" }}
          >
            <div className="demo-action-grid grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem] md:items-center md:gap-5">
              <button
                className="demo-submit group inline-flex min-h-14 items-center justify-center rounded-[0.7rem] bg-gradient-to-b from-[#ffc733] to-[#f5a51e] px-6 text-base font-black text-[#171206] shadow-[0_1rem_2rem_rgba(116,72,3,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-16 md:rounded-[0.55rem] md:px-8 md:text-lg md:shadow-[0_1.4rem_2.8rem_rgba(116,72,3,0.20)]"
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
              <div className="demo-status hidden min-h-16 items-center justify-center gap-4 rounded-[0.55rem] border border-[#bfc5ad] bg-[#fffdf5]/66 px-8 text-lg font-black text-[#153821] md:inline-flex">
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
            <p className="demo-note mt-3 inline-flex w-full items-center justify-center gap-2 text-xs font-bold text-[#5a6259] md:justify-start md:pl-[12.5rem] md:text-sm">
              <span className="h-4 w-4 text-[#456a4e]" aria-hidden="true">
                <LockIcon />
              </span>
              Secure demo • connects to live API
            </p>
            <ol className="mt-5 grid grid-cols-3 items-start rounded-[0.8rem] border border-[#d9d2be] bg-[#fffdf7]/70 p-3 md:hidden">
              {["Role", "Sign in", "Dashboard"].map((step, index) => (
                <li
                  className="relative grid justify-items-center gap-2 text-center"
                  key={step}
                >
                  {index < 2 ? (
                    <span
                      className="absolute left-[calc(50%+1rem)] top-3 h-px w-[calc(100%-2rem)] bg-[#c7d4bd]"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-xs font-black ${
                      index === 0 || (isLoading && index === 1)
                        ? "bg-[#0f4f24] text-white"
                        : "bg-[#d7e7cf] text-[#14351f]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-xs font-black text-[#274433]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            {error ? (
              <div className="demo-error mt-7 flex items-start justify-between gap-4 rounded-[0.55rem] border border-[#f0a59b] bg-[#fff0eb]/88 p-5 text-[#80251d] shadow-[0_1rem_2.2rem_rgba(94,35,24,0.06)]">
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
          className="demo-aside demo-enter-right hidden rounded-[0.8rem] bg-[#fffdf7]/88 p-7 shadow-[0_1.8rem_4rem_rgba(61,55,36,0.12)] backdrop-blur xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-[4.8rem] xl:block"
          style={{ animationDelay: "260ms" }}
          aria-label="Demo login status"
        >
          <p className="demo-aside-title mb-7 text-sm font-black uppercase tracking-[0.14em] text-[#28623a]">
            Your journey
          </p>
          <ol className="demo-steps grid gap-7">
            {[
              ["Choose role", "Select how you want to participate"],
              ["Sign in", "We'll sign you in with a demo account"],
              ["Load profile", "Your profile and data will be loaded"],
              ["Open dashboard", "You'll land in your role dashboard"],
            ].map(([title, body], index) => {
              const active = index === 0 || (isLoading && index === 1);

              return (
                <li
                  className="demo-step relative grid grid-cols-[2.5rem_1fr] gap-4"
                  key={title}
                >
                  {index < 3 ? (
                    <span
                      className="demo-step-line absolute left-5 top-11 h-[3.15rem] border-l-2 border-dashed border-[#c5d3bb]"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={`demo-step-number relative z-10 grid h-10 w-10 place-items-center rounded-full font-black ${
                      active
                        ? "bg-[#0f4f24] text-white"
                        : "bg-[#d7e7cf] text-[#14351f]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <strong className="demo-step-title block text-base font-black text-[#14351f] md:text-lg">
                      {title}
                    </strong>
                    <small className="demo-step-body mt-1 block text-sm font-semibold leading-6 text-[#5a6259] md:text-base">
                      {body}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="demo-secure-box mt-9 grid grid-cols-[1.65rem_1fr] gap-3 rounded-[0.7rem] bg-[#eef5e9] p-5">
            <span className="h-6 w-6 text-[#28623a]" aria-hidden="true">
              <ShieldIcon />
            </span>
            <span>
              <strong className="block font-black text-[#28623a]">
                Secure demo
              </strong>
              <span className="demo-secure-copy mt-2 block text-sm font-semibold leading-6 text-[#5a6259]">
                No password needed. Connections are secure and temporary.
              </span>
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}
