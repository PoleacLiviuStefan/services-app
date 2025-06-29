import React from 'react'

const PoliticaDeUtilizare = () => {
  return (
    <div className='flex flex-col justify-center items-center font-montSerrat w-full py-[10rem]'>
      <div className='flex flex-col justify-center items-start w-[90%] lg:w-[60rem]'>
        <h1 className='text-[24px] lg:text-[38px] font-bold'>Politică de utilizare</h1>
        <h2 className='text-[18px] lg:text-[24px] font-bold text-gray-400'>Mysticgold</h2>
        <p>
          Mysticgold este o platformă de consultații online unu-la-unu. Datele pe care ni le furnizezi pentru stabilirea și derularea consultațiilor, precum și pentru înscrierea la newsletter, vor fi considerate confidențiale de către Mysticgold și nu vor fi divulgate niciunui terț pentru alte folosințe.
        </p>
        <p>
          Numele, numărul de telefon, adresa de email, detaliile de plată și orice alte informații necesare pentru programarea și desfășurarea consultațiilor vor rămâne strict în interiorul firmei MYSTICGOLD SRL.
        </p>
        <p>
          Toate aceste detalii sunt utilizate exclusiv pentru organizarea sesiunilor de consultanță și pentru comunicarea ulterioară, în scopul garantării unei experiențe de calitate.
        </p>

        <h2 className='lg:text-[20px] text-[16px] font-bold mt-[.5rem]'>
          Politica de confidențialitate a datelor cu caracter personal
        </h2>
        <p>
          Prin furnizarea adresei de email pe platforma Mysticgold, îți exprimi acordul expres și neechivoc ca datele tale cu caracter personal (adresă de email, nume, telefon) să fie stocate și prelucrate de către MYSTICGOLD SRL.
        </p>
        <p>
          Scopul colectării datelor este comunicarea cu tine în legătură cu consultațiile rezervate, trimiterea de oferte și materiale informative, precum și realizarea de statistici interne. După ștergerea contului, datele personale pot fi transformate în date anonime pentru analize statistice.
        </p>
        <p>
          MYSTICGOLD SRL garantează confidențialitatea datelor tale și se angajează să nu facă publice sau să vândă baza de date a utilizatorilor.
        </p>
        <p>
          Informațiile din formularul de programare vor fi folosite pentru confirmarea consultațiilor, eventuale notificări legate de orar și actualizări de serviciu.
        </p>
        <p>
          Pentru exercitarea dreptului de acces, rectificare, ștergere sau opoziție, ne poți contacta în scris la <a href='mailto:contact@mysticgold.app' className='text-blue-600 underline'>contact@mysticgold.app</a>.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          a. Date generale colectate de Mysticgold
        </h2>
        <p>
          Colectăm informații precum nume și prenume, număr de telefon, adresă de email și date de plată, necesare pentru programarea și procesarea plăților pentru consultații. În cazul în care dorești ștergerea datelor, ne poți transmite o solicitare la <a href='mailto:contact@mysticgold.app' className='text-blue-600 underline'>contact@mysticgold.app</a>.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          b. Cine suntem?
        </h2>
        <p>
          Platforma online Mysticgold este administrată de MYSTICGOLD SRL. Pentru informații suplimentare, ne poți contacta la <a href='mailto:contact@mysticgold.app' className='text-blue-600 underline'>contact@mysticgold.app</a>.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          c. Datele cu caracter personal pe care le colectăm și cum le folosim
        </h2>
        <p>
          <span className='font-bold'>c.1.</span> Datele cu caracter personal sunt orice informație care te identifică direct sau indirect.
        </p>
        <p>
          <span className='font-bold'>c.2.</span> Folosim datele tale pentru:
        </p>
        <ul className='list-disc list-inside ml-4'>
          <li>confirmarea și gestionarea programărilor;</li>
          <li>trimiterea de notificări privind orarul și schimbările de ultim moment;</li>
          <li>facturarea consultațiilor prin intermediul procesatorului de plăți Stripe;</li>
          <li>transmiterea de materiale informative și oferte personalizate;</li>
          <li>realizarea de studii și statistici interne anonimizate.</li>
        </ul>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          d. De ce colectăm aceste date?
        </h2>
        <ul className='list-disc list-inside ml-4'>
          <li>Pentru a programa și confirma consultațiile.</li>
          <li>Pentru a comunica eficient cu tine înainte și după sesiuni.</li>
          <li>Pentru a trimite oferte și newslettere relevante.</li>
          <li>Pentru a preveni și detecta fraude în procesarea plăților.</li>
          <li>Pentru a îmbunătăți experiența utilizatorilor pe platformă.</li>
        </ul>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          e. Cine are acces la aceste date?
        </h2>
        <p>
          Accesul este limitat la angajați și colaboratori ai MYSTICGOLD SRL care intervin în administrarea platformei, procesarea plăților (Stripe) și comunicarea cu clienții. Toți partenerii noștri au obligații contractuale de confidențialitate.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          f. Gestionarea și securitatea datelor
        </h2>
        <p>
          Datele tale sunt stocate în servicii securizate cu certificate SSL și păstrate conform politicii interne pentru 365 zile de la ultima interacțiune, apoi pot fi șterse la cerere.
        </p>
        <p>
          Pentru orice solicitare legată de datele tale personale, ne poți contacta la <a href='mailto:contact@mysticgold.app' className='text-blue-600 underline'>contact@mysticgold.app</a>.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-[.5rem]'>
          g. Drepturile tale legale
        </h2>
        <p>
          Conform Regulamentului (UE) 2016/679, ai dreptul la informare, acces, rectificare, ștergere, restricționarea prelucrării, portabilitatea datelor și opoziție. Detalii complete pot fi găsite în textul regulamentului.
        </p>
      </div>
    </div>
  )
}

export default PoliticaDeUtilizare
