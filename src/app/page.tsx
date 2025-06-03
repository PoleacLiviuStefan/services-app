import About from "@/components/About";
import Hero from "../components/Hero";
import Slider from "../components/Slider";
import Curiosities from "@/components/Curiosities";
import Faq from "@/components/Faq";

const Page = () => {
  return (
    <div className="flex flex-col items-center w-full min-h-screen ">
      <Hero />

      <main className="flex flex-col items-center w-full">
        <div className="lg:w-[68rem] w-full space-y-20 py-12">
          <Slider />
          <About />
        </div>
        <Curiosities />
        <div className="lg:w-[68rem] w-full space-y-20 py-12">
          <Faq />
        </div>
      </main>
    </div>
  );
};

export default Page;
