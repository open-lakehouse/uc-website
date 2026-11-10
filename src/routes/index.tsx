import { createFileRoute } from "@tanstack/react-router";

import { Benefits } from "../components/pages/home/Benefits";
import { Cta } from "../components/pages/home/Cta";
import { Endorsements } from "../components/pages/home/Endorsements";
import { Faq } from "../components/pages/home/Faq";
import { FeatureDetails } from "../components/pages/home/FeatureDetails";
import { Hero } from "../components/pages/home/Hero";
import { Learn } from "../components/pages/home/Learn";
import { PartnerEcosystem } from "../components/pages/home/PartnerEcosystem";
import { TryIt } from "../components/pages/home/TryIt";
import { pageHead } from "../lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      description:
        "Unity Catalog transforms how you manage and govern data, ensuring compatibility and control across diverse platforms and tools.",
    }),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <Benefits />
      <TryIt />
      <FeatureDetails />
      <PartnerEcosystem />
      <Endorsements />
      <Learn />
      <Faq />
      <Cta />
    </>
  );
}
