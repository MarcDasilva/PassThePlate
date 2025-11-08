"use client";

import Image from "next/image";
import { Navbar, navLinkClasses } from "./components/navbar";
import { useEffect, useRef, useState } from "react";

const inputClasses =
  "w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black placeholder-white/50";
const projectNumberClasses = "text-black text-8xl font-bold";

const projects = [
  {
    id: "01",
    title: "Typography Project",
    description: "Exploring grid systems and typographic hierarchy",
  },
  {
    id: "02",
    title: "Poster Design",
    description: "Minimalist approach to visual communication",
  },
  {
    id: "03",
    title: "Brand Identity",
    description: "Clean, systematic visual language for modern brands",
  },
];

export default function Home() {
  const [isVisible, setIsVisible] = useState({
    hero: false,
    mission: false,
    help: false,
  });

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
              SHARE.
              <br />
              SAVE.
              <br />
              EARN.
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
                src="/frontimage.png"
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
        className="py-20 px-4 md:px-8 bg-[#244b20] text-white relative overflow-hidden"
      >
        <div className="container mx-auto">
          <h2
            className={`text-6xl font-bold tracking-tighter mb-12 transition-all duration-1000 ease-out ${
              isVisible.mission
                ? "translate-x-0 opacity-100"
                : "-translate-x-10 opacity-0"
            }`}
          >
            Mission
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(({ id, title, description }, index) => (
              <div
                key={id}
                className={`group transition-all duration-700 ease-out ${
                  isVisible.mission
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0"
                }`}
                style={{
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                <div className="aspect-square bg-white mb-4 overflow-hidden rounded-sm">
                  <div className="w-full h-full flex items-center justify-center bg-neutral-100 group-hover:bg-red-600 transition-all duration-500 transform group-hover:scale-105">
                    <span
                      className={`${projectNumberClasses} transition-all duration-500 group-hover:scale-110`}
                    >
                      {id}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 transition-transform duration-300 group-hover:translate-x-1">
                  {title}
                </h3>
                <p className="text-neutral-400 transition-transform duration-300 group-hover:translate-x-1">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Can Help Section */}
      <section
        ref={helpRef}
        id="help"
        className="py-20 px-4 md:px-8 bg-[#244b20] text-white"
      >
        <div className="container mx-auto">
          <h2
            className={`text-6xl font-bold tracking-tighter mb-12 transition-all duration-1000 ease-out ${
              isVisible.help
                ? "translate-x-0 opacity-100"
                : "translate-x-10 opacity-0"
            }`}
          >
            How We Can Help
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(({ id, title, description }, index) => (
              <div
                key={`help-${id}`}
                className={`group transition-all duration-700 ease-out ${
                  isVisible.help
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0"
                }`}
                style={{
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                <div className="aspect-square bg-white mb-4 overflow-hidden rounded-sm">
                  <div className="w-full h-full flex items-center justify-center bg-neutral-100 group-hover:bg-[#367230] transition-all duration-500 transform group-hover:scale-105">
                    <span
                      className={`${projectNumberClasses} transition-all duration-500 group-hover:scale-110`}
                    >
                      {id}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 transition-transform duration-300 group-hover:translate-x-1">
                  {title}
                </h3>
                <p className="text-neutral-400 transition-transform duration-300 group-hover:translate-x-1">
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
            <h2 className="text-6xl font-bold tracking-tighter mb-8">ABOUT</h2>
            <div className="aspect-[4-5] bg-neutral-100 relative mb-8 md:mb-0">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-black"></div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-7 md:pt-24">
            <p className="text-xl mb-6">
              Swiss Design, also known as International Typographic Style,
              emerged in Switzerland in the 1950s. It emphasizes cleanliness,
              readability, and objectivity.
            </p>
            <p className="mb-6">
              The style is characterized by sans-serif typography, grid systems,
              asymmetrical layouts, and photography instead of illustrations.
              Swiss Design pioneers believed that design should be clear,
              objective, and functional.
            </p>
            <p className="mb-6">
              Key figures include Josef Müller-Brockmann, Armin Hofmann, Emil
              Ruder, and Max Bill. Their work continues to influence design
              today.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-12">
              <div>
                <h3 className="text-sm uppercase tracking-widest mb-2">
                  Principles
                </h3>
                <ul className="space-y-2">
                  <li>Minimalism</li>
                  <li>Grid-based layouts</li>
                  <li>Sans-serif typography</li>
                  <li>Objective photography</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-widest mb-2">
                  Influences
                </h3>
                <ul className="space-y-2">
                  <li>Bauhaus</li>
                  <li>De Stijl</li>
                  <li>Constructivism</li>
                  <li>New Typography</li>
                </ul>
              </div>
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
