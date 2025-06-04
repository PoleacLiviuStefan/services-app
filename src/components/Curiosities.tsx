import React from "react";
import PresentationContainer from "./ui/presentationContainer";

const Curiosities = () => {
  return (
    <div className="flex flex-col items-center space-y-8 w-screen bg-primaryColor p-4">
      {" "}
      {/* <SectionTitle>De ce noi?</SectionTitle> */}
      <div className="flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8">
        <PresentationContainer
          title="Viziunea noastră"
          description="Vrem să construim cea mai de încredere comunitate de practicieni spirituali din România.
 O rețea de profesioniști verificați, dedicați, care nu oferă iluzii, ci ghidare reală, etică și profund transformată.
"
        />
        <PresentationContainer
          title="Ce facem diferit?"
          description="Selectăm cu atenție fiecare furnizor, în funcție de formare, etică și profesionalism
Oferim un sistem clar de programare și plată online, fără mesaje confuze sau interacțiuni riscante
"
        />
        <PresentationContainer
          title="Pentru cine este MysticGold?"
          description="Dacă ai simțit măcar o dată că ai nevoie de un sprijin real, dar nu știai încotro s-o apuci… ești în locul potrivit"
        />
      </div>
    </div>
  );
};

export default Curiosities;
