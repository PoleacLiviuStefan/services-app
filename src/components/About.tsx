import React from "react";
import SectionTitle from "./ui/sectionTitle";

const About = () => {
  return (

      <div className="flex flex-col items-start text-white space-y-12 p-4 border-primaryColor border-2 rounded-lg w-full h-full">
        <SectionTitle>Despre noi</SectionTitle>
        <div className="lg:grid lg:grid-cols-2 items-center gap-2 text-primaryColor px-8 lg:p-0">
          <div className="flex flex-col">
            <span className="text-lg lg:text-2xl font-bold">
              Care este scopul nostru?
            </span>
            <p className=" max-w-full lg:max-w-72">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Asperiores, perspiciatis illo. Voluptatem quidem neque voluptates expedita, aperiam qui quis itaque at ipsa eum odit fuga incidunt impedit sapiente. Iste tenetur autem quidem assumenda expedita facilis quam, aut, illo, beatae praesentium consequuntur eius porro fugit recusandae nam magni eum ad! Eius.</p>
          </div>
          <div className="flex flex-col items-center lg:flex-row gap-4">
            <span
              className="w-[200px] lg:w-[340px] h-[150px] lg:h-[250px] bg-gradient-to-tr from-secondaryColor to-[#001F44] shadow-lg shadow-secondaryColor"
              style={{
                clipPath:
                  "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }}
            ></span>

            <span
              className="w-[200px] lg:w-[340px] h-[150px] lg:h-[250px] text-md lg:text-xl bg-gradient-to-tr from-buttonSecondaryColor to-buttonPrimaryColor  shadow-lg shadow-primaryColor"
              style={{
                clipPath:
                  "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }}
            ></span>
          </div>
        </div>

      </div>
   
  );
};

export default About;
