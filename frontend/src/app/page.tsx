import Image from "next/image";
import type { UserRole } from "@/lib/api";
import { ExploreMapButton } from "./_components/ExploreMapButton";

type LandingRole = {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  image: string;
  demoRole: UserRole;
};

const activity = [
  ["Posted", "Community Cafe", "12 min ago"],
  ["Claimed", "2.3 km away", "8 min ago"],
  ["Volunteer assigned", "On the way", "3 min ago"],
];

const roles: LandingRole[] = [
  {
    eyebrow: "I can donate food",
    title: "Give surplus a second table.",
    body: "Businesses, restaurants, and kitchens can post safe food before it becomes waste.",
    action: "I want to donate",
    image: "/landing/cards/donate-card.webp",
    demoRole: "donor",
  },
  {
    eyebrow: "I need food",
    title: "Find nearby meals with dignity.",
    body: "Simple requests stay private, local, and coordinated through trusted community partners.",
    action: "I need food",
    image: "/landing/cards/need-card.webp",
    demoRole: "receiver",
  },
  {
    eyebrow: "I want to volunteer",
    title: "Move food while it still matters.",
    body: "Pickup routes and live updates help volunteers get meals where they are needed.",
    action: "I want to volunteer",
    image: "/landing/cards/volunteer-card.webp",
    demoRole: "volunteer",
  },
];

const pins = [
  { className: "pin pin-one", label: "Pantry" },
  { className: "pin pin-two", label: "Cafe" },
  { className: "pin pin-three", label: "Driver" },
  { className: "pin pin-four", label: "Shelter" },
];

function LeafIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path d="M41 6C22.6 7.4 10.5 15.8 8 31.2c8.7 1.2 25.1-3.7 33-25.2Z" />
      <path d="M8 39C16.6 26 25.8 18.4 36.2 12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="site-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-photo" aria-hidden="true">
          <Image
            src="/landing/foodlink_hero_girl_giving_food_v4.png"
            alt=""
            fill
            priority
            quality={95}
            className="hero-photo-image"
            sizes="100vw"
          />
        </div>
        <div className="hero-shade" aria-hidden="true" />

        <header className="nav">
          <a className="brand" href="#top" aria-label="FoodLink home">
            <span className="brand-mark">
              <LeafIcon />
            </span>
            FoodLink
          </a>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#roles">Roles</a>
            <a href="#impact">Impact</a>
            <a href="#get-involved">Get involved</a>
          </nav>
          <div className="nav-actions">
            <a className="button button-ghost" href="/demo">
              Get involved
            </a>
            <a className="signin" href="/demo">
              <span aria-hidden="true">♙</span>
              Sign in
            </a>
          </div>
        </header>

        <div className="hero-content" id="top">
          <div className="hero-copy">
            <h1 id="hero-title">FoodLink</h1>
            <p>Connect surplus food with people who need it, fast.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="/demo">
                Get involved
                <ArrowIcon />
              </a>
              <a className="button button-google" href="/demo">
                <span aria-hidden="true">G</span>
                Continue with Google or email
              </a>
            </div>
            <div className="neighbor-proof">
              <span className="faces" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
              <p className="neighbor-proof-copy">
                Join thousands of neighbors building a stronger community.
              </p>
            </div>
          </div>

          <aside
            className="activity-stack"
            aria-label="Recent FoodLink activity"
          >
            {activity.map(([status, place, time], index) => (
              <article className="activity-card" key={status}>
                <span className={`activity-icon activity-icon-${index + 1}`} />
                <div>
                  <strong>{status}</strong>
                  <span>{place}</span>
                  <small>{time}</small>
                </div>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <section className="impact-band" id="impact" aria-label="FoodLink impact">
        <div className="impact-mark">
          <LeafIcon />
        </div>
        <div className="impact-number">
          <strong>1,200</strong>
          <span>meals rescued</span>
          <small>Real impact from real neighbors.</small>
        </div>
        <div className="impact-item">
          <span className="round-icon">
            <LeafIcon />
          </span>
          <p>
            <strong>Less waste, more plates filled</strong>
            Good food stays in community and plates stay full.
          </p>
        </div>
        <div className="impact-item">
          <span className="round-icon location-dot" />
          <p>
            <strong>Nearby help, coordinated faster</strong>
            Real-time connections get food where it is needed.
          </p>
        </div>
        <a className="text-link" href="#roles">
          See our impact
          <ArrowIcon />
        </a>
      </section>

      <section className="roles-map" id="roles">
        <div className="roles-copy">
          <p className="hand-note">Every role makes a difference</p>
          <h2>Give, receive, volunteer.</h2>
          <p>Stronger together.</p>
        </div>

        <div className="role-cards">
          {roles.map((role, index) => (
            <article className="role-card" key={role.eyebrow}>
              <div className="role-text">
                <span className={`role-icon role-icon-${index + 1}`} />
                <p className="role-eyebrow">{role.eyebrow}</p>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
                <a href={`/demo?selectedRole=${role.demoRole}`}>
                  {role.action}
                  <ArrowIcon />
                </a>
              </div>
              <div className="role-media" aria-hidden="true">
                <Image
                  src={role.image}
                  alt=""
                  fill
                  quality={90}
                  sizes="(max-width: 560px) 100vw, (max-width: 820px) 32vw, 18vw"
                />
              </div>
            </article>
          ))}
        </div>

        <aside className="map-panel" id="how" aria-label="Live community map">
          <div className="map-copy">
            <span>Live community map</span>
            <h2>See FoodLink in action</h2>
            <p>
              Real-time map of available food, open requests, and volunteer
              activity in your area.
            </p>
            <ExploreMapButton>
              <ArrowIcon />
            </ExploreMapButton>
          </div>
          <div className="map-art" aria-hidden="true">
            <span className="river" />
            <span className="route" />
            {pins.map((pin) => (
              <span className={pin.className} key={pin.label} />
            ))}
          </div>
        </aside>
      </section>

      <section className="final-cta" id="get-involved">
        <h2>Small actions. Big community impact.</h2>
        <a className="button button-primary" href="/demo">
          Get involved today
          <ArrowIcon />
        </a>
        <LeafIcon />
      </section>
    </main>
  );
}
