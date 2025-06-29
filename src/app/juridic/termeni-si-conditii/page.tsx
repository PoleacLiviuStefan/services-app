import React from 'react'

const TermeniSiConditii = () => {
  return (
    <div className='flex flex-col justify-center items-center font-montSerrat w-full py-[10rem]'>
      <div className='flex flex-col justify-center items-start w-[90%] lg:w-[60rem]'>
        <h1 className='text-[24px] lg:text-[38px] font-bold'>Termeni și condiții de utilizare</h1>
        <h2 className='text-[18px] lg:text-[24px] font-bold text-gray-400 mt-2'>mysticgold.app</h2>

        <p className='mt-4'>
          Prin accesarea și utilizarea platformei Mysticgold, ești de acord cu următorii termeni și condiții. Dacă nu ești de acord, te rugăm să nu utilizezi serviciile noastre.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-6'>1. Descrierea serviciilor</h2>
        <p>
          mysticgold.app este o platformă de consultații online unu-la-unu, care permite programarea, desfășurarea și facturarea sesiunilor de consiliere virtuală. Conținutul și informațiile disponibile au scop informativ și pot fi actualizate periodic.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-6'>2. Exonerarea răspunderii</h2>
        <p>
          mysticgold.app nu răspunde pentru garanția rezultatelor obținute în urma consultațiilor și pentru eventuale daune sau pierderi rezultate din utilizarea platformei.
        </p>
        <p>
          Nu putem garanta disponibilitatea neîntreruptă sau lipsită de erori a serviciilor și nu suntem responsabili pentru întreruperi cauzate de probleme tehnice, de rețea sau de întreținere.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-6'>3. Reguli generale</h2>
        <p>
          Toate serviciile și materialele de pe mysticgold.app sunt furnizate pe baza principiului "așa cum sunt" și "așa cum sunt disponibile", fără nicio garanție expresă sau implicită.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-6'>4. Limitări tehnice</h2>
        <p>
          mysticgold.app nu este responsabil pentru indisponibilități ale platformei cauzate de factori externi, inclusiv mentenanță planificată sau neplanificată, atacuri cibernetice, defecțiuni ale infrastructurii terțe sau restricții de trafic.
        </p>

        <h2 className='text-[16px] lg:text-[20px] font-bold mt-6'>5. Modificarea termenilor</h2>
        <p>
          Ne rezervăm dreptul de a modifica acești termeni în orice moment, fără notificare prealabilă. Orice schimbare intră în vigoare de la data publicării pe platformă. Verifică periodic această pagină pentru a fi la curent cu actualizările.
        </p>

        <p className='mt-6'>
          Pentru întrebări sau clarificări privind termenii și condițiile, ne poți contacta la <a href="mailto:contact@mysticgold.app" className='text-blue-600 underline'>contact@mysticgold.app</a>.
        </p>
      </div>
    </div>
  )
}

export default TermeniSiConditii
