import About from "@/components/About";
import Hero from "../components/Hero";
import Slider from "../components/Slider";

const Page = () => {
  

  return (
<div className="flex flex-col items-center w-full h-screen ">
  <Hero />

  <main className="lg:w-[68rem] w-full ">
  <Slider />
  <About />
  </main>
</div>

  );
}

export default Page;
