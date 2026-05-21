import Image from "next/image";

const activity = [
  ["Posted", "Community Cafe", "12 min ago"],
  ["Claimed", "2.3 km away", "8 min ago"],
  ["Volunteer assigned", "On the way", "3 min ago"],
];

const roles = [
  {
    eyebrow: "I can donate food",
    title: "Give surplus a second table.",
    body: "Businesses, restaurants, and kitchens can post safe food before it becomes waste.",
    action: "I want to donate",
    image: "/landing/cards/donate-card.webp",
  },
  {
    eyebrow: "I need food",
    title: "Find nearby meals with dignity.",
    body: "Simple requests stay private, local, and coordinated through trusted community partners.",
    action: "I need food",
    image: "/landing/cards/need-card.webp",
  },
  {
    eyebrow: "I want to volunteer",
    title: "Move food while it still matters.",
    body: "Pickup routes and live updates help volunteers get meals where they are needed.",
    action: "I want to volunteer",
    image: "/landing/cards/volunteer-card.webp",
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
            <a className="button button-ghost" href="#get-involved">
              Get involved
            </a>
            <a className="signin" href="#signin">
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
              <a className="button button-primary" href="#get-involved">
                Get involved
                <ArrowIcon />
              </a>
              <a className="button button-google" href="#signin">
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
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
