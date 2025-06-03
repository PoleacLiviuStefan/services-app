import React from "react";
import FaqQuestion from "./FaqQuestion";

const Faq = () => {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 w-full px-4 py-8  text-primaryColor">
        <div>
            <h3 className="font-bold text-xl">FAQ</h3>
        </div>
        <div>
      <FaqQuestion
        title="Cum programez o ședință?"
        answer={
          <p className="flex flex-col">
            <ul>
              <li>
                1. Alege un furnizor din platformă, folosind filtrele în funcție
                de temă, metodă și stil de lucru.
              </li>
              <li>
                2. Intră pe profilul furnizorului și apasă pe butonul
                „Programează ședința”.
              </li>
              <li>
                3. Vei fi redirecționat către Calendly, unde alegi ziua și ora
                dorită.
              </li>
              <li>
                4. Completezi datele tale (nume, email, întrebare opțională).
              </li>
              <li>
                5. Vei fi direcționat către plata prin Stripe – sistem securizat
                de plată cu cardul.
              </li>
              <li>6. După plată, primești automat pe email:</li>
            </ul>
            <span>- factura fiscală</span>
            <span>- linkul Zoom pentru sesiune</span>
            <span>- confirmarea rezervării</span>
            <span>
              Sesiunea este considerată rezervată doar după plata online.
            </span>
            <span>
              Poți anula sau reprograma gratuit cu minim 12h înainte.
              Contactează furnizorul pentru reprogramare.
            </span>
          </p>
        }
      />

      <FaqQuestion
        title="Cum știu că pot avea încredere în practicienii de pe MysticGold?"
        answer={
          <p className="flex flex-col">
            Este o întrebare firească și importantă. Fiecare practician care
            apare pe MysticGold trece printr-un proces de selecție atent.
            Verificăm formarea lor, cerem discutăm valorile în lucru și ne
            asigurăm că înțeleg responsabilitatea pe care o implică ghidarea
            spirituală. Scopul nostru este să eliminăm riscurile și dezamăgirile
            pe care mulți le-au trăit în trecut. Aici nu găsești vrăjitoare de
            pe TikTok”, ci oameni dedicați, autentici și bine pregătiți.
          </p>
        }
      />
      <FaqQuestion
        title="Cum îmi dau seama ce practică mi se potrivește? Tarot, astrologie, Theta, numerologie?"
        answer={
          <>
            <p>
              Dacă nu știi exact ce cauți, e perfect în regulă. Fiecare furnizor
              își explică în profil modul de lucru și tipul de oameni cu care
              lucrează cel mai bine. Dacă tot nu știi ce să alegi, scrie-ne – te
              ajutăm cu plăcere să găsești potrivirea ideală.
            </p>
            <p>
              <span className="font-bold">Tarotul</span> - Ideal dacă vrei
              claritate emoțională, răspunsuri intuitive și ghidare în momentele
              de haos. Îți arată unde te minți, ce ai de schimbat și care e
              mesajul subconștientului tău.
            </p>
            <p>
              <span className="font-bold">Astrologia</span> - Harta ta natală
              este ca o hartă a sufletului tău. Afli ce vinzi karmice porți,
              care e scopul vieții tale, care sunt lecțiile relaționale și
              momentele de cotitură. Potrivită pentru autocunoaștere profundă și
              decizii importante.
            </p>
            <p>
              <span className="font-bold">
                Theta Healing / Terapie energetică
              </span>{" "}
              - Dacă simți că te ții pe tine în loc, dar nu știi cum. Lucrează
              direct cu subconștientul, vindecă traume, rușine, frici,
              atașamente dureroase. Ideală pentru eliberare, reconectare cu
              sinele și vindecare emoțională.
            </p>
            <p>
              <span className="font-bold">Numerologia</span> - Numerologia este
              limbajul invizibil al cifrelor care îți dezvăluie tiparele vieții,
              lecțiile karmice și potențialul personal. Prin data nașterii și
              numele tău, un numerolog poate descifra ce te guvernează din
              umbră: cum iubești, cum gândești, cum atragi abundența și în ce
              momente ale vieții tale apar schimbări majore.
            </p>
            <p>
              <span className="font-bold">Coaching spiritual / Consiliere</span>{" "}
              -Lucru aplicat, pe obiective, dar cu înțelepciune profundă. Ideal
              pentru claritate în acțiune, asumare, putere personală și curajul
              de a schimba concret ceva în viața ta.
            </p>
            <p>
              <span className="font-bold">Psihoterapia</span> este un spațiu
              sigur de explorare emoțională, susținut de terapeuți acreditați,
              care îmbină știința psihologiei cu profunzimea sufletului. Te
              ajută să înțelegi rădăcina suferinței tale, să vindeci traume și
              să-ți reconstruiești încrederea în tine, pas cu pas.
            </p>
          </>
        }
      />
            <FaqQuestion
        title="Cum plătesc? E sigur?"
        answer={
          <p>
            Da. Plățile se fac online, direct pe site, printr-un sistem securizat (Stripe). MysticGold nu stochează datele cardului tău. Primești imediat factura pe email, iar dacă ceva nu merge, echipa de suport este foarte receptivă.
          </p>
        }
      />
                  <FaqQuestion
        title="Ce fac dacă nu mai pot ajunge la sesiune?"
        answer={
          <p>
            Ai dreptul să anulezi sau să reprogramezi sesiunea gratuit, cu minim <span className="font-bold">12 de ore înainte</span>. Dacă ai o urgență reală, scrie-ne și vom găsi o soluție. Respectul pentru timpul tău și al furnizorului este esențial în comunitatea noastră.<span className="font-bold">Contactează URGENT</span> furnizorul dacă dorești reprogramare. 
          </p>
        }
      />
                        <FaqQuestion
        title="Pot lucra pe o temă specifică – de exemplu, despărțirea de cineva sau blocajul în carieră?"
        answer={
          <p>
            Desigur. Practicienii noștri lucrează cu teme variate – relații, traume, anxietăți, lipsa direcției, blocaje financiare, probleme de familie sau de stimă de sine. Este important să îți formulezi clar intenția sau întrebările. Uneori, ghidarea ajunge și mai adânc decât ți-ai imaginat.
          </p>
        }
      />
                              <FaqQuestion
        title="Pot să ofer o sesiune cuiva drag?"
        answer={
          <p>
            Da! Avem opțiunea de <span className="font-bold">voucher cadou</span>, perfect pentru o prietenă aflată într-un moment dificil sau pentru cineva care vrea să înceapă o călătorie spirituală. Poți alege valoarea și destinatarul va primi un email cu toate detaliile.
          </p>
        }
      />
                                    <FaqQuestion
        title="Este nevoie să cred în astrologie sau tarot ca să funcționeze?"
        answer={
          <p>
            Da, ai nevoie de deschidere, curiozitate și dorința de a te cunoaște mai bine. Fiecare metodă e o oglindă – ce alegi să vezi și să faci cu informația rămâne în mâinile tale. Multe persoane sceptice au avut parte de revelații reale, pentru că au fost dispuse să asculte altfel.
          </p>
        }
      />
      </div>
    </div>
  );
};

export default Faq;
