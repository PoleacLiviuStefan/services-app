import React from "react";
import SectionTitle from "./ui/sectionTitle";

const About = () => {
  return (
    <div id="despre-noi" className="flex flex-col items-start text-white space-y-12 p-4 border-primaryColor border-2 rounded-lg w-full h-full">
      <SectionTitle>Despre noi</SectionTitle>
      <div className="flex flex-col lg:grid lg:grid-cols-2 items-center gap-2 text-primaryColor px-3 lg:p-0">
        <div className="flex flex-col">
          <span className="text-lg lg:text-2xl font-bold">
            Povestea MysticGold
          </span>
          <h3 className="font-bold">
            Pentru că ghidarea spirituală merită să fie făcută 
            <br/>cu seriozitate,integritate și iubire.
          </h3>
          <p className=" max-w-full lg:max-w-80">
            MysticGold s-a născut dintr-o nevoie reală și dureroasă: prea mulți
            oameni ajung să ceară ajutor în cele mai vulnerabile momente ale
            vieții, doar ca să fie dezamăgiți. Să investească bani, încredere și
            speranță… și să primească răspunsuri vagi, practicieni nepregătiți
            sau chiar promisiuni false.<br/> Noi am simțit asta. Am văzut asta. Și am
            spus: <span className="font-bold">ajunge</span>. Așa a luat naștere MysticGold – o platformă care își
            propune să fie un spațiu sigur, curat și autentic pentru toți cei
            care caută sprijin prin astrologie, tarot, numerologie, terapie
            energetică sau coaching spiritual.
          </p>
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
