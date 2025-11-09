"use client";

import Image from "next/image";
import { Navbar, navLinkClasses } from "./components/navbar";
import { useEffect, useRef, useState } from "react";

const inputClasses =
  "w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black placeholder-white/50";
const projectNumberClasses = "text-black text-8xl font-bold";

const projects = [
  {
    id: "1 in 6",
    title: "...Children Experience Food Insecurity",
    description:
      "Causing 67% increase in diabetes, 40% increase in hypertension, and 30% increase in being overweight compared with food‑secure peers",
    url: "https://proof.utoronto.ca/2025/new-data-on-household-food-insecurity-in-2024/",
  },
  {
    id: "30-40%",
    title: "...of The US Food Supply is Thrown Away",
    description:
      "This consists of the retail and consumer level, wasting 133 Billion dollars, $161 Billion globally",
    url: "https://pubmed.ncbi.nlm.nih.gov/31576509/",
  },
  {
    id: "58%",
    title: "...Experienced on Barrier to Food Security",
    description:
      "Preventing government and non-profit food services access, caused by transportation, identitification, and policy issues",
    url: "https://apnorc.org/projects/more-than-half-of-americans-facing-food-challenges-struggle-to-get-support/?utm_source=chatgpt.com",
  },
];

const helpProjects = [
  {
    id: "Share",
    title: "Share Your Food",
    description:
      "Donate excess and expiring food items to help those in need in your community",
  },
  {
    id: "Save",
    title: "Save Lives",
    description:
      "Your donations directly impact families facing food insecurity, reducing food waste and increasing access to food for those in need",
  },
  {
    id: "Earn",
    title: "Earn Rewards",
    description:
      "Get rewarded for your contributions with points and recognition for your efforts",
  },
];

export default function Home() {
  const [isVisible, setIsVisible] = useState({
    hero: false,
    mission: false,
    help: false,
  });
  const [underlinedWord, setUnderlinedWord] = useState<
    "share" | "save" | "earn" | null
  >(null);
  const [underlinedWords, setUnderlinedWords] = useState<
    Set<"share" | "save" | "earn">
  >(new Set());

  const heroRef = useRef<HTMLElement>(null);
  const missionRef = useRef<HTMLElement>(null);
  const helpRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section");
          if (sectionId) {
            setIsVisible((prev) => ({ ...prev, [sectionId]: true }));
          }
        }
      });
    }, observerOptions);

    const refs = [
      { ref: heroRef, id: "hero" },
      { ref: missionRef, id: "mission" },
      { ref: helpRef, id: "help" },
    ];

    refs.forEach(({ ref, id }) => {
      if (ref.current) {
        ref.current.setAttribute("data-section", id);
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Underline animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setUnderlinedWord("share");
      setUnderlinedWords((prev) => new Set(prev).add("share"));
      setTimeout(() => {
        setUnderlinedWord("save");
        setUnderlinedWords((prev) => new Set(prev).add("save"));
        setTimeout(() => {
          setUnderlinedWord("earn");
          setUnderlinedWords((prev) => new Set(prev).add("earn"));
        }, 500); // 0.5s delay between each word
      }, 500);
    }, 200); // Start after 0.2 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#367230]">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="pt-32 pb-20 px-4 md:px-8 container mx-auto"
      >
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 mb-8 md:mb-0">
            <h1
              className={`text-8xl md:text-[10rem] font-bold tracking-tighter leading-none mb-6 text-white transition-all duration-1000 ease-out ${
                isVisible.hero
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
            >
              <span className="inline-block relative">
                SHARE.
                {/* Light green dot at top right */}
                <span className="absolute -top-4 -right-4 w-16 h-16 bg-green-300 rounded-full" />
                {underlinedWords.has("share") && (
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-black"
                    style={{
                      animation:
                        underlinedWord === "share"
                          ? "underline 0.5s ease-out forwards"
                          : "none",
                      width: underlinedWord === "share" ? undefined : "100%",
                    }}
                  />
                )}
              </span>
              <br />
              <span
                className="inline-block relative font-cursive"
                style={{ fontWeight: "normal" }}
              >
                SAVE.
                {underlinedWords.has("save") && (
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-black"
                    style={{
                      animation:
                        underlinedWord === "save"
                          ? "underline 0.5s ease-out forwards"
                          : "none",
                      width: underlinedWord === "save" ? undefined : "100%",
                    }}
                  />
                )}
              </span>
              <br />
              <span className="inline-block relative">
                EARN.
                {underlinedWords.has("earn") && (
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-black"
                    style={{
                      animation:
                        underlinedWord === "earn"
                          ? "underline 0.5s ease-out forwards"
                          : "none",
                      width: underlinedWord === "earn" ? undefined : "100%",
                    }}
                  />
                )}
              </span>
            </h1>
            <p
              className={`text-xl max-w-xl text-white transition-all duration-1000 delay-200 ease-out ${
                isVisible.hero
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
            >
              Share Goods, Save Lives, Earn Rewards
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col items-center justify-center">
            <div
              className={`relative w-full aspect-square border-2 border-black transition-all duration-1000 delay-300 ease-out ${
                isVisible.hero
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-10 opacity-0 scale-95"
              }`}
            >
              <Image
                src="/frontimage2.png"
                alt="Front Image"
                fill
                style={{ objectFit: "cover" }}
              />
              <div className="absolute -bottom-3 -right-3 w-30 h-30 bg-black" />
            </div>
            {/* Caption below the image */}
            <p
              className={`mt-4 text-center text-white text-xl max-w-xl transition-all duration-1000 delay-500 ease-out ${
                isVisible.hero
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
            >
              "1 in 7 Households experience Food Insecurity" - USDA
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section
        ref={missionRef}
        id="mission"
        className="py-20 px-4 md:px-8 bg-[#244b20] text-white relative"
      >
        <div className="container mx-auto relative">
          <h2
            className={`text-6xl font-bold tracking-tighter mb-12 transition-all duration-1000 ease-out relative inline-block ${
              isVisible.mission
                ? "translate-x-0 opacity-100"
                : "-translate-x-10 opacity-0"
            }`}
          >
            /Why <span className="font-cursive">-- Are We --</span> Needed/?
            {isVisible.mission && (
              <span
                className="absolute bottom-0 left-0 h-[2px] bg-black"
                style={{
                  animation: "underline 0.5s ease-out forwards",
                }}
              />
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(({ id, title, description, url }, index) => (
              <a
                key={id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group transition-all duration-700 ease-out block relative ${
                  isVisible.mission
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0"
                }`}
                style={{
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                {/* Green circle for number 3 (index 2) */}
                {index === 2 && (
                  <span className="absolute -top-3 -right-3 w-16 h-16 bg-green-300 rounded-full z-20" />
                )}
                <div
                  className="aspect-square mb-4 overflow-hidden relative border-4 border-black transition-all duration-500 group-hover:border-8"
                  style={{
                    backgroundImage: `url(/number${index + 1}.jpg)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Dark overlay to make image darker */}
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                  <div className="w-full h-full flex items-center justify-center relative z-10">
                    <span className={`${projectNumberClasses} text-white`}>
                      {id}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white transition-transform duration-300 group-hover:translate-x-1">
                  {title}
                </h3>
                <p className="text-white transition-transform duration-300 group-hover:translate-x-1">
                  {description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* We are all Neighbours - positioned between sections */}
      <div className="relative -mt-8 md:-mt-12 mb-0">
        <div
          className={`absolute top-18 right-40 px-4 md:px-8 z-10 transition-all duration-1000 ease-out ${
            isVisible.help
              ? "translate-x-0 opacity-100"
              : "translate-x-10 opacity-0"
          }`}
        >
          <h3 className="text-4xl md:text-7xl font-bold tracking-tighter text-white">
            _We (are all){" "}
            <span className="font-cursive text-6xl md:text-8xl lg:text-10xl">
              Neighbours*
            </span>
          </h3>
        </div>
      </div>

      {/* How We Can Help Section */}
      <section
        ref={helpRef}
        id="help"
        className="pt-32 md:pt-20 pb-20 px-4 md:px-8 bg-[#244b20] text-white"
      >
        <div className="container mx-auto">
          <h2
            className={`text-6xl font-bold tracking-tighter mb-12 transition-all duration-1000 ease-out relative inline-block ${
              isVisible.help
                ? "translate-x-0 opacity-100"
                : "translate-x-10 opacity-0"
            }`}
          >
            How <span className="font-cursive">WE-</span> Can Help
            {isVisible.help && (
              <span
                className="absolute bottom-0 left-0 h-[2px] bg-black"
                style={{
                  animation: "underline 0.5s ease-out forwards",
                }}
              />
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {helpProjects.map(({ id, title, description }, index) => (
              <div
                key={`help-${id}`}
                className={`group transition-all duration-700 ease-out relative ${
                  isVisible.help
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0"
                }`}
                style={{
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                <div
                  className="aspect-square mb-4 overflow-hidden relative border-4 border-black transition-all duration-500 group-hover:border-8"
                  style={{
                    backgroundImage: `url(/number${index + 4}.png)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Dark overlay to make image darker */}
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                  <div className="w-full h-full flex items-center justify-center relative z-10">
                    <span className={`${projectNumberClasses} text-white`}>
                      {id}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white transition-transform duration-300 group-hover:translate-x-1">
                  {title}
                </h3>
                <p className="text-white transition-transform duration-300 group-hover:translate-x-1">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 md:px-8 text-white">
        <div className="container mx-auto grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <h2 className="text-6xl font-bold tracking-tighter mb-8">
              -*ABOUT*-
            </h2>
            <div className="aspect-[4-5] bg-neutral-100 relative mb-8 md:mb-0">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-black"></div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-7 md:pt-24">
            <p className="text-xl mb-6">
              PassThePlate is an original Hackathon project @HackPrinceton25 by
              a solo developer. It was built over a grueling 36 hours of coding,
              design, and development, but the outcome was well worth it.
            </p>
            <p className="mb-6">
              The idea was founded by a previous endeavour to bring awareness to
              food insecurity and food waste. Previously I started a local non
              profit organization to help raise food donations for those in need
              in the community, and this project is an extension of that
              endeavour. It aims to help reduce food waste and increase access
              to food for those in need. Saving lives and reducing food waste.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-12">
              <div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 md:px-8 bg-black text-white">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-6xl font-bold tracking-tighter mb-8">
              CONTACT
            </h2>
            <p className="text-xl mb-8">
              Have Some Feedback? Send us an email :0
            </p>
            <div className="space-y-4">
              {[{ label: "Location", value: "Toronto, Ontario" }].map(
                ({ label, value }) => (
                  <p key={label} className="flex items-center">
                    <span className="w-24 text-sm uppercase tracking-widest">
                      {label}
                    </span>
                    <span>{value}</span>
                  </p>
                )
              )}
            </div>
          </div>
          <div>
            <form className="space-y-6">
              {["Name", "Email", "Message"].map((field) => (
                <div key={field}>
                  <label
                    htmlFor={field.toLowerCase()}
                    className="block text-sm uppercase tracking-widest mb-2"
                  >
                    {field}
                  </label>
                  {field === "Message" ? (
                    <textarea
                      id={field.toLowerCase()}
                      rows={4}
                      className={inputClasses}
                      placeholder={`Your ${field.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      id={field.toLowerCase()}
                      type={field === "Email" ? "email" : "text"}
                      className={inputClasses}
                      placeholder={`Your ${field.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                className="mt-8 px-8 py-3 bg-white text-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 bg-black text-white">
        <div className="container mx-auto flex justify-center items-center">
          <p className="text-sm">© 2025 PassThePlate. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
