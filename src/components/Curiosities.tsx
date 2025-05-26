import React from "react";
import PresentationContainer from "./ui/presentationContainer";

const Curiosities = () => {
  return (
    <div className="flex flex-col items-center space-y-8 w-screen bg-primaryColor p-4">
      {" "}
      {/* <SectionTitle>De ce noi?</SectionTitle> */}
      <div className="flex flex-col lg:flex-row space-x-8">
        <PresentationContainer
          title="titlu1"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Totam cumque odio tenetur tempora consequatur ex perspiciatis quas incidunt id. Suscipit."
        />
        <PresentationContainer
          title="titlu2"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Totam cumque odio tenetur tempora consequatur ex perspiciatis quas incidunt id. Suscipit."
        />
        <PresentationContainer
          title="titlu3"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Totam cumque odio tenetur tempora consequatur ex perspiciatis quas incidunt id. Suscipit."
        />
      </div>
    </div>
  );
};

export default Curiosities;
